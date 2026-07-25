import { Controller, Get, Post, Delete, Param, UseGuards, Body } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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
  constructor(private readonly docsService: DocumentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Param('kbId') kbId: string) {
    const data = await this.docsService.listByKB(kbId);
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Param('kbId') kbId: string, @Body() dto: any) {
    const data = await this.docsService.create(kbId, dto);
    return { success: true, data };
  }
}
