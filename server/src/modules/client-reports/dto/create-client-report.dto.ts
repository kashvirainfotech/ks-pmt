import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectHealthStatus {
  ON_TRACK = 'ON_TRACK',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  AT_RISK = 'AT_RISK',
}

export enum ReportAudienceScope {
  CLIENT_ALL = 'CLIENT_ALL',
  CLIENT_APPROVERS_ONLY = 'CLIENT_APPROVERS_ONLY',
  INTERNAL_ONLY = 'INTERNAL_ONLY',
}

export class ClientActionItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  urgency?: string;
}

export class MilestoneForecastDto {
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsString()
  @IsNotEmpty()
  milestoneName: string;

  @IsOptional()
  @IsString()
  committedDate?: string;

  @IsString()
  @IsNotEmpty()
  indicativeForecastDate: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  varianceDays?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SanitizedRiskDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  risk: string;

  @IsOptional()
  @IsString()
  impact?: string;

  @IsOptional()
  @IsString()
  mitigation?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CommercialSummaryDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  contractValue?: number;

  @IsOptional()
  approvedCrValue?: number;

  @IsOptional()
  invoicedToDate?: number;

  @IsOptional()
  currentMilestoneBilled?: number;
}

export class CreateClientReportDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  periodStartDate: string;

  @IsDateString()
  @IsNotEmpty()
  periodEndDate: string;

  @IsOptional()
  @IsEnum(ProjectHealthStatus)
  overallHealth?: ProjectHealthStatus = ProjectHealthStatus.ON_TRACK;

  @IsOptional()
  @IsString()
  healthNarrative?: string;

  @IsString()
  @IsNotEmpty()
  executiveSummary: string;

  @IsOptional()
  @IsString()
  deliveredWorkSummary?: string;

  @IsOptional()
  @IsString()
  nextStepsSummary?: string;

  @IsOptional()
  @IsString()
  decisionsNeededSummary?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientActionItemDto)
  clientActionItems?: ClientActionItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneForecastDto)
  milestoneForecasts?: MilestoneForecastDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SanitizedRiskDto)
  sanitizedRisks?: SanitizedRiskDto[];

  @IsOptional()
  @IsBoolean()
  includeCommercials?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CommercialSummaryDto)
  commercialSummary?: CommercialSummaryDto;

  @IsOptional()
  @IsEnum(ReportAudienceScope)
  audienceScope?: ReportAudienceScope = ReportAudienceScope.CLIENT_ALL;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
