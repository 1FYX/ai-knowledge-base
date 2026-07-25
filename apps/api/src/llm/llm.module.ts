import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
