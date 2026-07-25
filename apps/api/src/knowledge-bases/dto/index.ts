import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class CreateKBDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsInt()
  @Min(100)
  @Max(8000)
  @IsOptional()
  chunkSize?: number;

  @IsInt()
  @Min(0)
  @Max(2000)
  @IsOptional()
  chunkOverlap?: number;
}

export class UpdateKBDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
