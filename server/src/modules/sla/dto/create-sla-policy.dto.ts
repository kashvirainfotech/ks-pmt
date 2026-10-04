import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
} from 'class-validator';

export enum SlaTier {
  TIER_1_CRITICAL = 'TIER_1_CRITICAL',
  TIER_2_HIGH = 'TIER_2_HIGH',
  TIER_3_STANDARD = 'TIER_3_STANDARD',
  TIER_4_BASIC = 'TIER_4_BASIC',
}

export enum SlaTimeBasis {
  BUSINESS_HOURS = 'BUSINESS_HOURS',
  ELAPSED_HOURS = 'ELAPSED_HOURS',
}

export class CreateSlaPolicyDto {
  @IsString()
  @IsNotEmpty()
  policyCode: string;

  @IsString()
  @IsNotEmpty()
  policyName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  taskTypeId?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsEnum(SlaTier)
  @IsOptional()
  tier?: SlaTier = SlaTier.TIER_3_STANDARD;

  @IsString()
  @IsOptional()
  calendarId?: string;

  @IsInt()
  @Min(1)
  responseTimeMinutes: number;

  @IsEnum(SlaTimeBasis)
  @IsOptional()
  responseTimeBasis?: SlaTimeBasis = SlaTimeBasis.BUSINESS_HOURS;

  @IsInt()
  @Min(1)
  resolutionTimeMinutes: number;

  @IsEnum(SlaTimeBasis)
  @IsOptional()
  resolutionTimeBasis?: SlaTimeBasis = SlaTimeBasis.BUSINESS_HOURS;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  responseWarningThresholdPct?: number = 75;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  resolutionWarningThresholdPct?: number = 75;

  @IsArray()
  @IsOptional()
  escalationRules?: any[] = [];

  @IsInt()
  @IsOptional()
  precedenceRank?: number = 100;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}
