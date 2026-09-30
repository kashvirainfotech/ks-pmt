import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductIdeaStatus, RoadmapBucket } from './create-product-idea.dto';

export class QueryProductIdeasDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsEnum(ProductIdeaStatus)
  status?: ProductIdeaStatus;

  @IsOptional()
  @IsEnum(RoadmapBucket)
  roadmapBucket?: RoadmapBucket;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'rice' | 'votes' | 'created_at';
}
