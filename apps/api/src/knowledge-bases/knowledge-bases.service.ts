import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KnowledgeBasesService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, search?: string) {
    return this.prisma.knowledgeBase.findMany({
      where: {
        ownerId: userId,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        _count: { select: { documents: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: string, dto: any) {
    return this.prisma.knowledgeBase.create({
      data: { ...dto, ownerId: userId },
    });
  }

  async getById(id: string) {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        documents: {
          select: { id: true, originalName: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { documents: true } },
      },
    });
    if (!kb) throw new NotFoundException('Knowledge base not found');
    return kb;
  }

  async update(id: string, dto: any) {
    return this.prisma.knowledgeBase.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    return this.prisma.knowledgeBase.delete({ where: { id } });
  }
}
