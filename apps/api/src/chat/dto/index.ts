import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsUUID()
  @IsOptional()
  knowledgeBaseId?: string;
}

export class SendMessageDto {
  @IsString()
  content: string;
}
