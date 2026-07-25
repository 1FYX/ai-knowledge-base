import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '../llm/llm.module';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [PrismaModule, LlmModule, VectorModule],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
