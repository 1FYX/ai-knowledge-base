import { Module } from '@nestjs/common';
import { DocumentsController, KBDocsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VectorModule } from '../vector/vector.module';
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [PrismaModule, VectorModule, IngestionModule],
  controllers: [DocumentsController, KBDocsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
