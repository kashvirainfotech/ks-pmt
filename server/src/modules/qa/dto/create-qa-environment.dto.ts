import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
  IsObject,
} from 'class-validator';

export enum QaEnvironmentType {
  INTERNAL_QA = 'INTERNAL_QA',
  DEV = 'DEV',
  STAGING = 'STAGING',
  CLIENT_UAT = 'CLIENT_UAT',
  CLIENT_PRODUCTION = 'CLIENT_PRODUCTION',
  ON_PREMISE_CLIENT = 'ON_PREMISE_CLIENT',
}

export enum QaScopeType {
  GLOBAL = 'GLOBAL',
  PRODUCT = 'PRODUCT',
  PROJECT = 'PROJECT',
  CLIENT = 'CLIENT',
}

export class CreateQaEnvironmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  env_name: string;

  @IsEnum(QaEnvironmentType)
  @IsNotEmpty()
  env_type: QaEnvironmentType;

  @IsEnum(QaScopeType)
  @IsNotEmpty()
  scope_type: QaScopeType;

  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsUUID()
  @IsOptional()
  project_id?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  region?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  context_metadata?: Record<string, any>;
}

export class UpdateQaEnvironmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  env_name?: string;

  @IsEnum(QaEnvironmentType)
  @IsOptional()
  env_type?: QaEnvironmentType;

  @IsEnum(QaScopeType)
  @IsOptional()
  scope_type?: QaScopeType;

  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsUUID()
  @IsOptional()
  project_id?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  region?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  context_metadata?: Record<string, any>;
}
