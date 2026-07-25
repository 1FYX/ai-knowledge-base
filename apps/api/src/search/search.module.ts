import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '../llm/llm.module';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [PrismaModule, LlmModule, VectorModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
