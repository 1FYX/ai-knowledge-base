import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vector/vector.service';

/**
 * 文档元数据 CRUD + 文件存储路径管理。
 * 真正的解析/embedding 由 IngestionService 异步处理（documents 模块触发）。
 */
@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private vector: VectorService,
  ) {}

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
      },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // document_chunks 用 pgvector，Prisma 未生成其 delegate，单独用 raw count
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "document_chunks" WHERE document_id = ${id};
    `;
    return { ...doc, _count: { chunks: rows[0]?.count ?? 0 } };
  }

  /** 创建文档记录（文件由 Multer 已落盘，这里只存元数据） */
  async createFromUpload(params: {
    kbId: string;
    file: Express.Multer.File;
  }) {
    const { kbId, file } = params;
    return this.prisma.document.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        knowledgeBaseId: kbId,
        status: 'PENDING',
      },
    });
  }

  async delete(id: string) {
    // 先删向量（pgvector 表），再删文档元数据
    await this.vector.deleteByDocument(id);
    return this.prisma.document.delete({ where: { id } });
  }
}
