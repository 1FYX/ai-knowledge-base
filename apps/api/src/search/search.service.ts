import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { VectorService, SearchResult } from '../vector/vector.service';

@Injectable()
export class SearchService {
  constructor(
    private llm: LlmService,
    private vector: VectorService,
  ) {}

  /**
   * 语义检索：query → embedding → pgvector top-k。
   * 若用户未配置 LLM，getDecryptedLlmConfig 抛 'LLM_NOT_CONFIGURED'，
   * 由调用方（controller / filter）转成可读响应。
   */
  async semanticSearch(params: {
    userId: string;
    query: string;
    knowledgeBaseId: string;
    limit?: number;
  }): Promise<SearchResult[]> {
    const { userId, query, knowledgeBaseId, limit = 5 } = params;

    // 1. 生成查询向量
    const queryEmbedding = await this.llm.embedOne(userId, query);

    // 2. 向量检索 top-k
    return this.vector.search(queryEmbedding, knowledgeBaseId, limit);
  }
}
