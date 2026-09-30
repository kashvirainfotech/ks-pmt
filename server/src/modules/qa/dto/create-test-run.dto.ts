import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTestRunDto {
  @IsOptional()
  @IsString()
  runCode?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(['PRODUCT', 'PROJECT'])
  entityType: 'PRODUCT' | 'PROJECT';

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
  @IsEnum(['LOCAL', 'QA', 'STAGING', 'UAT', 'PRODUCTION', 'ON_PREMISE'])
  environment?: 'LOCAL' | 'QA' | 'STAGING' | 'UAT' | 'PRODUCTION' | 'ON_PREMISE';

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  /**
   * Optionally populate with test cases from specific suites or IDs
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  testCaseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  testSuiteIds?: string[];
}

export class UpdateTestRunDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['LOCAL', 'QA', 'STAGING', 'UAT', 'PRODUCTION', 'ON_PREMISE'])
  environment?: 'LOCAL' | 'QA' | 'STAGING' | 'UAT' | 'PRODUCTION' | 'ON_PREMISE';

  @IsOptional()
  @IsEnum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'])
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
