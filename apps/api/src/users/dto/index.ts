import { IsOptional, IsString } from 'class-validator';

/**
 * 用户 LLM 配置（BYOK）。
 * baseUrl / chatModel / embeddingModel 明文存储；apiKey 加密存储。
 * 支持任意 OpenAI 兼容端点（官方 / Azure / 国内中转 / Ollama 等）。
 */
export class UpdateLlmConfigDto {
  @IsString()
  @IsOptional()
  baseUrl?: string; // e.g. https://api.openai.com/v1

  @IsString()
  @IsOptional()
  apiKey?: string; // 加密入库；为空表示清除 key

  @IsString()
  @IsOptional()
  chatModel?: string; // e.g. gpt-4o

  @IsString()
  @IsOptional()
  embeddingModel?: string; // e.g. text-embedding-3-small
}

/** LLM 配置对外结构（永远不返回明文 apiKey，只返回是否已配置） */
export class LlmConfigView {
  baseUrl?: string;
  hasApiKey: boolean;
  chatModel?: string;
  embeddingModel?: string;
}
