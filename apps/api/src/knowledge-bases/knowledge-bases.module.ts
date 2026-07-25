import { Module } from '@nestjs/common';
import { KnowledgeBasesController } from './knowledge-bases.controller';
import { KnowledgeBasesService } from './knowledge-bases.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeBasesController],
  providers: [KnowledgeBasesService],
})
export class KnowledgeBasesModule {}
