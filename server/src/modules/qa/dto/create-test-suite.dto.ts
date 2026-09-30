import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTestSuiteDto {
  @IsOptional()
  @IsString()
  suiteCode?: string;

  @IsNotEmpty()
  @IsString()
  suiteName: string;

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
  componentId?: string;
}

export class UpdateTestSuiteDto {
  @IsOptional()
  @IsString()
  suiteName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  componentId?: string;
}
