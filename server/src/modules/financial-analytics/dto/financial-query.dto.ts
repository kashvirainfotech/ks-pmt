import { IsOptional, IsUUID, IsDateString, IsString } from 'class-validator';

export class FinancialAnalyticsQueryDto {
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}
