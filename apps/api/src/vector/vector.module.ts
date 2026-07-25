import { Module } from '@nestjs/common';
import { VectorService } from './vector.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VectorService],
  exports: [VectorService],
})
export class VectorModule {}
