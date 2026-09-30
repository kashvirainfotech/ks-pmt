import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateReleaseChecklistItemInput {
  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsNotEmpty()
  @IsEnum(['QA_TESTING', 'SECURITY', 'CLIENT_UAT', 'DOCUMENTATION', 'DATA_MIGRATION', 'PERFORMANCE'])
  gateCategory: 'QA_TESTING' | 'SECURITY' | 'CLIENT_UAT' | 'DOCUMENTATION' | 'DATA_MIGRATION' | 'PERFORMANCE';

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class CreateReleaseChecklistDto {
  @IsOptional()
  @IsString()
  checklistCode?: string;

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

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsDateString()
  targetReleaseDate?: string;

  @IsOptional()
  @IsUUID()
  leadQaUserId?: string;

  @IsOptional()
  @IsUUID()
  signoffPmUserId?: string;

  @IsOptional()
  @IsArray()
  customItems?: CreateReleaseChecklistItemInput[];
}
