import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { KnowledgeBasesService } from './knowledge-bases.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateKBDto, UpdateKBDto } from './dto';

@Controller('knowledge-bases')
export class KnowledgeBasesController {
  constructor(private readonly kbService: KnowledgeBasesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: any, @Query('search') search?: string) {
    const data = await this.kbService.list(user.sub, search);
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: any, @Body() dto: CreateKBDto) {
    const data = await this.kbService.create(user.sub, dto);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string) {
    const data = await this.kbService.getById(id);
    return { success: true, data };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateKBDto) {
    const data = await this.kbService.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    await this.kbService.delete(id);
    return { success: true };
  }
}
