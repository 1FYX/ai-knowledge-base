import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { IsString, IsInt, IsOptional } from 'class-validator';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class SearchDto {
  @IsString()
  query!: string;

  @IsString()
  knowledgeBaseId!: string;

  @IsInt()
  @IsOptional()
  limit?: number;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async search(@CurrentUser() user: any, @Body() dto: SearchDto) {
    if (!dto?.query || !dto?.knowledgeBaseId) {
      throw new BadRequestException('query and knowledgeBaseId are required');
    }
    try {
      const data = await this.searchService.semanticSearch({
        userId: user.sub,
        query: dto.query,
        knowledgeBaseId: dto.knowledgeBaseId,
        limit: dto.limit,
      });
      return { success: true, data };
    } catch (e) {
      // 用户未配置 LLM 时给出明确中文提示
      if (e instanceof Error && e.message === 'LLM_NOT_CONFIGURED') {
        throw new BadRequestException('尚未配置 AI 服务，请先在「设置」页填写 LLM 配置。');
      }
      // 其他错误：LlmService 已翻译成友好中文，直接抛出由全局过滤器处理
      throw e;
    }
  }
}
