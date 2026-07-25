import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { UsersService } from '../users/users.service';
import { describeLlmError } from '../common/utils/llm-error.util';

/**
 * LLM 抽象层（BYOK）。
 * 每个用户的配置不同，因此 client 按需创建、不缓存长期持有
 * （配置可能随时改动；缓存会引入一致性问题，且 client 是轻量对象）。
 *
 * 支持任意 OpenAI 兼容端点：官方 / Azure OpenAI / 国内中转 / Ollama 等，
 * 由用户在"设置"页填写 baseUrl + apiKey + 模型名。
 */
@Injectable()
export class LlmService {
  constructor(private usersService: UsersService) {}

  /** 为指定用户创建 OpenAI client（配置未填全会抛 LLM_NOT_CONFIGURED） */
  private async clientFor(userId: string): Promise<{
    client: OpenAI;
    chatModel: string;
    embeddingModel: string;
  }> {
    const cfg = await this.usersService.getDecryptedLlmConfig(userId);
    const client = new OpenAI({
      baseURL: cfg.baseUrl,
      apiKey: cfg.apiKey,
    });
    return { client, chatModel: cfg.chatModel, embeddingModel: cfg.embeddingModel };
  }

  /** 包装底层错误：注入操作类型与模型名提示，便于 describeLlmError 翻译 */
  private wrap(err: unknown, op: 'embedding' | 'chat', model: string): Error {
    const e = err as any;
    e._op = op;
    e._modelHint = `模型「${model}」`;
    return new Error(describeLlmError(e), { cause: err });
  }

  /** 批量生成 embedding，返回向量数组（顺序与输入一致） */
  async embed(userId: string, texts: string[]): Promise<number[][]> {
    const { client, embeddingModel } = await this.clientFor(userId);
    try {
      const resp = await client.embeddings.create({
        model: embeddingModel,
        input: texts,
      });
      // 按 index 排序，保证顺序与输入一致
      return resp.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    } catch (err) {
      throw this.wrap(err, 'embedding', embeddingModel);
    }
  }

  /** 单条文本 embedding 的便捷封装 */
  async embedOne(userId: string, text: string): Promise<number[]> {
    const [vec] = await this.embed(userId, [text]);
    return vec;
  }

  /** 非流式 chat */
  async chat(
    userId: string,
    messages: ChatCompletionMessageParam[],
    options?: { temperature?: number },
  ): Promise<string> {
    const { client, chatModel } = await this.clientFor(userId);
    try {
      const resp = await client.chat.completions.create({
        model: chatModel,
        messages,
        temperature: options?.temperature ?? 0.7,
      });
      return resp.choices[0]?.message?.content ?? '';
    } catch (err) {
      throw this.wrap(err, 'chat', chatModel);
    }
  }

  /**
   * 流式 chat：逐 token 产出。
   * 用 async generator，调用方 `for await` 消费。
   */
  async *chatStream(
    userId: string,
    messages: ChatCompletionMessageParam[],
    options?: { temperature?: number },
  ): AsyncGenerator<string, void, unknown> {
    const { client, chatModel } = await this.clientFor(userId);
    let stream;
    try {
      stream = await client.chat.completions.create({
        model: chatModel,
        messages,
        temperature: options?.temperature ?? 0.7,
        stream: true,
      });
    } catch (err) {
      throw this.wrap(err, 'chat', chatModel);
    }
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

