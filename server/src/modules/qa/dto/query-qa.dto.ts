import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTestSuitesDto {
  @IsOptional()
  @IsEnum(['PRODUCT', 'PROJECT'])
  entityType?: 'PRODUCT' | 'PROJECT';

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class QueryTestCasesDto {
  @IsOptional()
  @IsUUID()
  suiteId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(['TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
  severity?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional()
  @IsEnum(['MANUAL', 'AUTOMATED'])
  executionType?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}

export class QueryTestRunsDto {
  @IsOptional()
  @IsEnum(['PRODUCT', 'PROJECT'])
  entityType?: 'PRODUCT' | 'PROJECT';

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  versionId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class QueryReleaseChecklistsDto {
  @IsOptional()
  @IsEnum(['PRODUCT', 'PROJECT'])
  entityType?: 'PRODUCT' | 'PROJECT';

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  versionId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsOptional()
  @IsString()
  overallStatus?: string;
}
