import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { VectorService } from '../vector/vector.service';
import { parseFile } from './parser';
import { splitText } from './chunker';

/**
 * 文档摄入服务：编排"解析 → 切片 → embedding → 入库"全流程。
 *
 * 状态机：PENDING → PROCESSING → INDEXED / ERROR
 * 错误信息写入 document.errorMessage（schema 已有字段）。
 *
 * 说明：当前用 fire-and-forget（不 await 的后台 Promise）触发处理，
 * 上传接口可立即返回。生产级应升级为 BullMQ（独立 worker + 重试 + 限流），
 * 但那需要 Redis 与独立 worker 进程，见 roadmap M5。
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private vector: VectorService,
  ) {}

  /**
   * 异步处理一个文档（不抛错：内部捕获并写入状态/错误信息）。
   * 用 fire-and-forget 调用：`this.process(docId, userId).catch()`
   */
  async process(documentId: string, userId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { knowledgeBase: { select: { chunkSize: true, chunkOverlap: true } } },
    });
    if (!doc) {
      this.logger.warn(`文档不存在：${documentId}`);
      return;
    }

    // 进入处理中
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      // 1. 解析
      this.logger.log(`解析文档：${doc.originalName}`);
      const { text, pageCount } = await parseFile(
        doc.filePath,
        doc.mimeType,
        doc.originalName,
      );

      if (!text.trim()) {
        throw new Error('解析得到空文本（可能是扫描版 PDF 或空文件）');
      }

      // 更新页数
      if (pageCount) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { pageCount },
        });
      }

      // 2. 切片
      const chunks = splitText(
        text,
        doc.knowledgeBase.chunkSize,
        doc.knowledgeBase.chunkOverlap,
      );
      if (chunks.length === 0) throw new Error('切片结果为空');
      this.logger.log(`切片完成：${chunks.length} 块`);

      // 3. 批量 embedding（分批避免单次请求过大）
      const BATCH = 16;
      const allEmbeddings: number[][] = [];
      for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const vecs = await this.llm.embed(
          userId,
          batch.map((c) => c.content),
        );
        allEmbeddings.push(...vecs);
      }

      // 4. 入库（向量 + 元数据）
      await this.vector.upsertChunks(
        chunks.map((c, i) => ({
          content: c.content,
          embedding: allEmbeddings[i],
          documentId,
          chunkIndex: c.chunkIndex,
          pageNumber: c.pageNumber,
        })),
      );

      // 5. 标记完成
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'INDEXED' },
      });
      this.logger.log(`文档已索引：${doc.originalName}（${chunks.length} 块）`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`文档处理失败 ${doc.originalName}：${message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR', errorMessage: message },
      });
    }
  }
}
