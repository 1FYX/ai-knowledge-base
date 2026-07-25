import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentsService } from './documents.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/** 允许的文件类型 */
const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

/** Multer 磁盘存储配置：保存到 uploads/，文件名加时间戳防冲突 */
const storage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
    cb(null, unique);
  },
});

@Controller('documents')
export class DocumentsController {
  constructor(private readonly docsService: DocumentsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string) {
    const data = await this.docsService.getById(id);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    await this.docsService.delete(id);
    return { success: true };
  }
}

@Controller('knowledge-bases/:kbId/documents')
export class KBDocsController {
  constructor(
    private readonly docsService: DocumentsService,
    private readonly ingestion: IngestionService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Param('kbId') kbId: string) {
    const data = await this.docsService.listByKB(kbId);
    return { success: true, data };
  }

  /** 上传文档：Multer 接文件 → 建元数据记录 → fire-and-forget 触发 ingestion */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          return cb(new BadRequestException('仅支持 PDF / DOCX / TXT / MD'), false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Param('kbId') kbId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new BadRequestException('未接收到文件（字段名需为 file）');

    // 1. 建元数据记录（status=PENDING）
    const doc = await this.docsService.createFromUpload({ kbId, file });

    // 2. fire-and-forget 触发后台处理（不阻塞响应）
    //    内部捕获所有错误并写入状态，不会影响上传响应
    this.ingestion.process(doc.id, user.sub).catch((e) => {
      // 仅记录，错误已在 process 内部处理
      console.error('ingestion 启动失败:', e);
    });

    return { success: true, data: doc };
  }
}
