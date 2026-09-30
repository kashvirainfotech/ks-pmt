import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export enum ProductIdeaStatus {
  PROPOSED = 'PROPOSED',
  UNDER_EVALUATION = 'UNDER_EVALUATION',
  PLANNED = 'PLANNED',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
  RELEASED = 'RELEASED',
  DECLINED = 'DECLINED',
  DEFERRED = 'DEFERRED',
  MERGED = 'MERGED',
}

export enum RoadmapBucket {
  NOW = 'NOW',
  NEXT = 'NEXT',
  LATER = 'LATER',
}

export enum ProductIdeaVisibility {
  INTERNAL_ONLY = 'INTERNAL_ONLY',
  PRODUCT_COMMUNITY = 'PRODUCT_COMMUNITY',
  PUBLIC = 'PUBLIC',
}

export class CreateProductIdeaDto {
  @IsUUID()
  productId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  sanitizedDescription: string;

  @IsOptional()
  @IsString()
  customerProblem?: string;

  @IsOptional()
  @IsString()
  expectedOutcome?: string;

  @IsOptional()
  @IsUUID()
  moduleOrComponentId?: string;

  @IsOptional()
  @IsString()
  targetSegment?: string;

  @IsOptional()
  @IsEnum(ProductIdeaStatus)
  status?: ProductIdeaStatus;

  @IsOptional()
  @IsString()
  statusReason?: string;

  @IsOptional()
  @IsEnum(RoadmapBucket)
  roadmapBucket?: RoadmapBucket;

  @IsOptional()
  @IsString()
  indicativeTarget?: string;

  // RICE Prioritization
  @IsOptional()
  @IsInt()
  @Min(0)
  reach?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  impactScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  confidenceScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(20)
  effortScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  strategicFit?: number;

  @IsOptional()
  @IsString()
  scoringRationale?: string;

  // Moderation & Visibility
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsEnum(ProductIdeaVisibility)
  visibility?: ProductIdeaVisibility;

  // Confidential internal audit & customer impact
  @IsOptional()
  @IsUUID()
  submittedByUserId?: string;

  @IsOptional()
  @IsUUID()
  submittedByClientId?: string;

  @IsOptional()
  @IsUUID()
  submittedByContactId?: string;

  @IsOptional()
  @IsString()
  privateEvidenceNotes?: string;

  @IsOptional()
  @IsString()
  internalCommercialImpact?: string;

  // Delivery linkages
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
