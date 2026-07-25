import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 向量存储层（基于 pgvector）。
 *
 * 注意：schema 里 DocumentChunk.embedding 是 Unsupported("vector(1536)")，
 * Prisma 因此不会为该模型生成 delegate（无 tx.documentChunk）。
 * 本服务的所有读写一律走原生 SQL（$queryRaw / $executeRaw）。
 *
 * 距离约定：余弦距离 `<=>`，相似度 = 1 - 距离（范围 [0,1]）。
 */

/** 向量转 pgvector 字面量字符串：[0.1,0.2,...] */
function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

export interface ChunkToInsert {
  content: string;
  embedding: number[];
  documentId: string;
  chunkIndex: number;
  pageNumber?: number | null;
  metadata?: unknown;
}

export interface SearchResult {
  id: string;
  content: string;
  documentId: string;
  documentName: string;
  knowledgeBaseId: string;
  chunkIndex: number;
  pageNumber: number | null;
  similarity: number;
}

@Injectable()
export class VectorService {
  constructor(private prisma: PrismaService) {}

  /**
   * 批量写入切片及其向量（含 embedding）。
   * 一条原生 INSERT 写入所有字段；embedding 用 ::vector cast。
   * uuid 主键由 DB 默认生成（gen_random_uuid()）。
   */
  async upsertChunks(chunks: ChunkToInsert[]): Promise<void> {
    if (chunks.length === 0) return;
    await Promise.all(
      chunks.map((c) => {
        const page = c.pageNumber ?? null;
        const meta = c.metadata == null ? null : JSON.stringify(c.metadata);
        return this.prisma.$executeRaw`
          INSERT INTO "document_chunks"
            (id, content, embedding, chunk_index, page_number, metadata, document_id, created_at)
          VALUES (
            gen_random_uuid(),
            ${c.content},
            ${toVectorLiteral(c.embedding)}::vector,
            ${c.chunkIndex},
            ${page},
            ${meta}::jsonb,
            ${c.documentId},
            NOW()
          );
        `;
      }),
    );
  }

  /**
   * 向量相似度检索：在指定知识库内找 top-k 最相关切片。
   */
  async search(
    queryEmbedding: number[],
    knowledgeBaseId: string,
    k = 5,
  ): Promise<SearchResult[]> {
    const lit = toVectorLiteral(queryEmbedding);
    const rows = await this.prisma.$queryRaw<SearchResult[]>`
      SELECT
        c.id,
        c.content,
        c.document_id AS "documentId",
        d.original_name AS "documentName",
        d.knowledge_base_id AS "knowledgeBaseId",
        c.chunk_index AS "chunkIndex",
        c.page_number AS "pageNumber",
        1 - (c.embedding <=> ${lit}::vector) AS similarity
      FROM "document_chunks" c
      JOIN documents d ON d.id = c.document_id
      WHERE d.knowledge_base_id = ${knowledgeBaseId}
      ORDER BY c.embedding <=> ${lit}::vector
      LIMIT ${k};
    `;
    return rows as unknown as SearchResult[];
  }

  /** 删除某文档的所有切片（含向量），文档删除时调用 */
  async deleteByDocument(documentId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "document_chunks" WHERE document_id = ${documentId};
    `;
  }
}
