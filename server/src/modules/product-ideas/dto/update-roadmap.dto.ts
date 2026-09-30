import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProductIdeaStatus, RoadmapBucket } from './create-product-idea.dto';

export class UpdateRoadmapDto {
  @IsEnum(RoadmapBucket)
  roadmapBucket: RoadmapBucket;

  @IsOptional()
  @IsString()
  indicativeTarget?: string;

  @IsOptional()
  @IsEnum(ProductIdeaStatus)
  status?: ProductIdeaStatus;

  @IsOptional()
  @IsUUID()
  targetVersionId?: string;

  @IsOptional()
  @IsUUID()
  deliveryTaskId?: string;

  @IsOptional()
  @IsString()
  changelogSummary?: string;
}
