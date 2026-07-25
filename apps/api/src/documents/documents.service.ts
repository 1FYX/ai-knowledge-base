import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async listByKB(kbId: string) {
    return this.prisma.document.findMany({
      where: { knowledgeBaseId: kbId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        knowledgeBase: { select: { id: true, name: true } },
        _count: { select: { chunks: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(kbId: string, dto: any) {
    return this.prisma.document.create({
      data: {
        ...dto,
        knowledgeBaseId: kbId,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.document.delete({ where: { id } });
  }
}
