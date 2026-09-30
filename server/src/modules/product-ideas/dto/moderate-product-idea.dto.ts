import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProductIdeaStatus, ProductIdeaVisibility, RoadmapBucket } from './create-product-idea.dto';

export class ModerateProductIdeaDto {
  @IsBoolean()
  isPublished: boolean;

  @IsOptional()
  @IsString()
  sanitizedDescription?: string;

  @IsOptional()
  @IsEnum(ProductIdeaVisibility)
  visibility?: ProductIdeaVisibility;

  @IsOptional()
  @IsEnum(ProductIdeaStatus)
  status?: ProductIdeaStatus;

  @IsOptional()
  @IsEnum(RoadmapBucket)
  roadmapBucket?: RoadmapBucket;

  @IsOptional()
  @IsString()
  indicativeTarget?: string;

  @IsOptional()
  @IsString()
  statusReason?: string;
}
