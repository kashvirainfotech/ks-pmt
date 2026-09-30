import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export enum RaidCategory {
  RISK = 'RISK',
  ASSUMPTION = 'ASSUMPTION',
  DECISION = 'DECISION',
  ISSUE = 'ISSUE',
}

export enum RaidLikelihood {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum RaidImpact {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ClientVisibility {
  INTERNAL_ONLY = 'INTERNAL_ONLY',
  CLIENT_SUMMARY = 'CLIENT_SUMMARY',
  CLIENT_FULL = 'CLIENT_FULL',
}

export class AlternativeConsideredDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  pros?: string;

  @IsOptional()
  @IsString()
  cons?: string;

  @IsOptional()
  @IsString()
  estimatedCostOrEffort?: string;

  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

export class CreateRaidItemDto {
  @IsEnum(RaidCategory)
  category: RaidCategory;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // Risk attributes
  @IsOptional()
  @IsEnum(RaidLikelihood)
  likelihood?: RaidLikelihood;

  @IsOptional()
  @IsEnum(RaidImpact)
  impact?: RaidImpact;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  riskScore?: number;

  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @IsOptional()
  @IsString()
  contingencyPlan?: string;

  // Internal confidential discussions (strictly zero-leak to client)
  @IsOptional()
  @IsString()
  internalDiscussion?: string;

  // Traceability links
  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  componentId?: string;

  @IsOptional()
  @IsUUID()
  realizedBlockerEpisodeId?: string;

  // Decision / Architecture ADR attributes
  @IsOptional()
  @IsArray()
  participants?: any[];

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsArray()
  alternativesConsidered?: AlternativeConsideredDto[];

  @IsOptional()
  @IsString()
  rationale?: string;

  @IsOptional()
  @IsString()
  consequences?: string;

  @IsOptional()
  @IsString()
  technicalImpact?: string;

  @IsOptional()
  @IsString()
  businessImpact?: string;

  @IsOptional()
  @IsUUID()
  supersedesId?: string;

  @IsOptional()
  @IsBoolean()
  isClientShared?: boolean;

  @IsOptional()
  @IsEnum(ClientVisibility)
  clientVisibility?: ClientVisibility;

  @IsOptional()
  @IsString()
  clientSummary?: string;
}
