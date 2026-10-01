import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ActivityTimeFilter {
  LAST_LOGIN = 'LAST_LOGIN',
  HOURS_24 = 'HOURS_24',
  DAYS_7 = 'DAYS_7',
  DAYS_14 = 'DAYS_14',
  DAYS_30 = 'DAYS_30',
  SINCE_BASELINE = 'SINCE_BASELINE',
  CUSTOM_RANGE = 'CUSTOM_RANGE',
}

export class QueryActivityDto {
  @IsOptional()
  @IsEnum(ActivityTimeFilter)
  timeFilterType?: ActivityTimeFilter = ActivityTimeFilter.LAST_LOGIN;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  baselineId?: string;

  @IsOptional()
  @IsString()
  scopeType?: string; // 'PROJECT', 'PRODUCT', 'SPRINT', 'RELEASE'

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsBoolean()
  isClientSafe?: boolean = false;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 50;
}
