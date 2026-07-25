import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { VectorService, SearchResult } from '../vector/vector.service';

/** 流式回调：controller 层用它把事件写进 SSE 响应 */
export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onSources?: (sources: SearchResult[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/** RAG 召回条数与历史轮数 */
const TOP_K = 5;
const HISTORY_TURNS = 6; // 最近 6 条消息（约 3 轮对话）

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private vector: VectorService,
  ) {}

  async listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async createSession(userId: string, dto: any) {
    return this.prisma.chatSession.create({
      data: { userId, ...dto },
    });
  }

  async getSession(id: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        knowledgeBase: { select: { id: true, name: true } },
      },
    });
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  async deleteSession(id: string) {
    return this.prisma.chatSession.delete({ where: { id } });
  }

  /** 非流式发送：用于无法消费 SSE 的场景（保留兼容） */
  async sendMessage(sessionId: string, dto: any, userId: string) {
    const session = await this.getSession(sessionId);
    if (session.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'USER', content: dto.content },
    });

    const { answer, sources } = await this.generate(session, userId, dto.content);

    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: answer,
        sources: sources as any,
      },
    });
    return assistantMsg;
  }

  /**
   * 流式 RAG 对话：
   * 1. 保存用户消息
   * 2. query embedding + 向量检索召回（若会话绑定了知识库）
   * 3. 拼 prompt（system + 召回上下文 + 历史 + 用户问题）
   * 4. 流式调 LLM，逐 token 推送；累积全文
   * 5. 完成后存助手消息（含 sources）
   */
  async streamMessage(
    sessionId: string,
    dto: any,
    userId: string,
    cb: StreamCallbacks,
  ) {
    try {
      const session = await this.getSession(sessionId);
      if (session.userId !== userId) {
        throw new ForbiddenException('Not authorized');
      }

      // 1. 保存用户消息
      await this.prisma.chatMessage.create({
        data: { sessionId, role: 'USER', content: dto.content },
      });

      // 2. RAG 召回（仅当会话绑定了知识库）
      let sources: SearchResult[] = [];
      if (session.knowledgeBaseId) {
        const queryVec = await this.llm.embedOne(userId, dto.content);
        sources = await this.vector.search(queryVec, session.knowledgeBaseId, TOP_K);
        cb.onSources?.(sources);
      }

      // 3. 拼 messages
      const messages = await this.buildMessages(session, dto.content, sources);

      // 4. 流式生成
      let full = '';
      for await (const chunk of this.llm.chatStream(userId, messages, {
        temperature: session.temperature ?? 0.7,
      })) {
        full += chunk;
        cb.onChunk(chunk);
      }

      // 5. 保存助手消息
      await this.prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: full,
          sources: (sources.length ? sources : null) as any,
        },
      });

      cb.onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '对话失败，请稍后重试';
      if (msg === 'LLM_NOT_CONFIGURED') {
        cb.onError('尚未配置 AI 服务，请先在「设置」页填写 LLM 配置后再对话。');
      } else {
        // LlmService 已经把 OpenAI 错误翻译成友好中文消息
        cb.onError(msg);
      }
    }
  }

  /** 非流式生成（sendMessage 用） */
  private async generate(
    session: any,
    userId: string,
    query: string,
  ): Promise<{ answer: string; sources: SearchResult[] }> {
    let sources: SearchResult[] = [];
    if (session.knowledgeBaseId) {
      const queryVec = await this.llm.embedOne(userId, query);
      sources = await this.vector.search(queryVec, session.knowledgeBaseId, TOP_K);
    }
    const messages = await this.buildMessages(session, query, sources);
    const answer = await this.llm.chat(userId, messages, {
      temperature: session.temperature ?? 0.7,
    });
    return { answer, sources };
  }

  /** 组装 chat messages：system prompt + 召回上下文 + 历史消息 + 当前问题 */
  private async buildMessages(
    session: any,
    query: string,
    sources: SearchResult[],
  ): Promise<ChatCompletionMessageParam[]> {
    const messages: ChatCompletionMessageParam[] = [];

    // system prompt
    const sys =
      session.systemPrompt ||
      '你是一个严谨的知识库问答助手。请优先依据下面的「参考资料」回答用户问题；' +
        '若资料不足，可结合自身知识但需说明。回答尽量简洁、准确。';
    messages.push({ role: 'system', content: sys });

    // 召回上下文
    if (sources.length > 0) {
      const ctx = sources
        .map((s, i) => `[${i + 1}] (来源: ${s.documentName})\n${s.content}`)
        .join('\n\n');
      messages.push({
        role: 'system',
        content: `以下是相关参考资料，请基于它们回答用户：\n\n${ctx}`,
      });
    }

    // 历史消息（最近 N 条，不含刚保存的当前问题）
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: HISTORY_TURNS,
      // 当前问题刚被存入，取最后 N 条会包含它；这里跳过最后一条
      skip: 0,
    });
    // 去掉刚保存的当前用户消息（避免与下面显式追加的 query 重复）
    const trimmed = history.slice(0, Math.max(0, history.length - 1));
    for (const m of trimmed) {
      if (m.role === 'USER') {
        messages.push({ role: 'user', content: m.content });
      } else if (m.role === 'ASSISTANT') {
        messages.push({ role: 'assistant', content: m.content });
      }
    }

    // 当前问题
    messages.push({ role: 'user', content: query });
    return messages;
  }
}
