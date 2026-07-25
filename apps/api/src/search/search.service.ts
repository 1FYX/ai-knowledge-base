import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async semanticSearch(params: {
    query: string;
    knowledgeBaseId?: string;
    limit?: number;
  }) {
    // Placeholder: real implementation requires OpenAI embedding + pgvector
    // For now, return keyword search results
    const { query, knowledgeBaseId, limit = 5 } = params;

    const where: any = {
      content: { contains: query, mode: 'insensitive' },
    };

    if (knowledgeBaseId) {
      where.document = { knowledgeBaseId };
    }

    const chunks = await this.prisma.documentChunk.findMany({
      where,
      take: limit,
      include: {
        document: { select: { id: true, originalName: true, knowledgeBaseId: true } },
      },
    });

    return chunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      document: chunk.document,
      similarity: 0.85, // placeholder
    }));
  }
}
