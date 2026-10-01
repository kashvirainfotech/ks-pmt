import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import {
  KnowledgeAudience,
  KnowledgeCategory,
  KnowledgeDocStatus,
  KnowledgeEntityType,
} from './create-knowledge-doc.dto';

export class QueryKnowledgeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @IsOptional()
  @IsEnum(KnowledgeEntityType)
  entityType?: KnowledgeEntityType;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(KnowledgeAudience)
  audience?: KnowledgeAudience;

  @IsOptional()
  @IsEnum(KnowledgeDocStatus)
  status?: KnowledgeDocStatus;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
