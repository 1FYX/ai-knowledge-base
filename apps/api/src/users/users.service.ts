import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLlmConfigDto, LlmConfigView } from './dto';
import { encrypt, decrypt } from '../common/utils/crypto.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
    });
  }

  /** 读取 LLM 配置（对外视图：不暴露明文 apiKey，仅返回是否已配置） */
  async getLlmConfig(userId: string): Promise<LlmConfigView> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        llmBaseUrl: true,
        llmApiKey: true,
        llmChatModel: true,
        llmEmbeddingModel: true,
      },
    });
    if (!u) return { hasApiKey: false };
    return {
      baseUrl: u.llmBaseUrl ?? undefined,
      hasApiKey: !!u.llmApiKey,
      chatModel: u.llmChatModel ?? undefined,
      embeddingModel: u.llmEmbeddingModel ?? undefined,
    };
  }

  /** 更新 LLM 配置。apiKey 非空时加密入库，传空字符串则清除。 */
  async updateLlmConfig(userId: string, dto: UpdateLlmConfigDto): Promise<LlmConfigView> {
    const data: Record<string, string | null> = {};
    if (dto.baseUrl !== undefined) data.llmBaseUrl = dto.baseUrl || null;
    if (dto.chatModel !== undefined) data.llmChatModel = dto.chatModel || null;
    if (dto.embeddingModel !== undefined) data.llmEmbeddingModel = dto.embeddingModel || null;
    if (dto.apiKey !== undefined) {
      data.llmApiKey = dto.apiKey ? encrypt(dto.apiKey) : null;
    }

    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getLlmConfig(userId);
  }

  /**
   * 取当前用户的完整 LLM 配置（含解密后的 apiKey），供 LLM 模块调用。
   * 若未配置完整，抛出 Error，由调用方转成 LLM_NOT_CONFIGURED 响应。
   */
  async getDecryptedLlmConfig(userId: string): Promise<{
    baseUrl: string;
    apiKey: string;
    chatModel: string;
    embeddingModel: string;
  }> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        llmBaseUrl: true,
        llmApiKey: true,
        llmChatModel: true,
        llmEmbeddingModel: true,
      },
    });
    if (!u || !u.llmBaseUrl || !u.llmApiKey || !u.llmChatModel || !u.llmEmbeddingModel) {
      throw new Error('LLM_NOT_CONFIGURED');
    }
    return {
      baseUrl: u.llmBaseUrl,
      apiKey: decrypt(u.llmApiKey),
      chatModel: u.llmChatModel,
      embeddingModel: u.llmEmbeddingModel,
    };
  }
}
