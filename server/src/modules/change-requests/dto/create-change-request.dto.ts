import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateChangeRequestDto {
  @IsOptional()
  @IsString()
  crNumber?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  originatingIntakeRequestId?: string;

  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  businessJustification: string;

  @IsOptional()
  @IsString()
  impactSummary?: string;

  @IsNotEmpty()
  @IsUUID()
  accountablePmUserId: string;

  @IsOptional()
  @IsUUID()
  linkedMilestoneId?: string;

  // Initial Revision details
  @IsNotEmpty()
  @IsString()
  scopeDescription: string;

  @IsOptional()
  @IsArray()
  deliverables?: Array<{ title: string; description?: string; targetDate?: string }>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quotedPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scheduleDelayDays?: number;

  @IsOptional()
  @IsString()
  revisedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  revisionReason?: string;
}
