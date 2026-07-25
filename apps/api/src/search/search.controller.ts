import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async search(
    @CurrentUser() user: any,
    @Body() body: { query: string; knowledgeBaseId?: string; limit?: number },
  ) {
    const data = await this.searchService.semanticSearch(body);
    return { success: true, data };
  }
}
