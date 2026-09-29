import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WorkflowScope {
  GLOBAL = 'GLOBAL',
  PROJECT = 'PROJECT',
  PRODUCT = 'PRODUCT',
}

export enum WorkflowSchemeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateWorkflowSchemeDto {
  @IsString()
  @IsNotEmpty()
  schemeCode: string;

  @IsString()
  @IsNotEmpty()
  schemeName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkflowScope)
  @IsNotEmpty()
  scope: WorkflowScope;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  taskTypeId?: string;
}

export class UpdateWorkflowSchemeDto {
  @IsString()
  @IsOptional()
  schemeName?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class SchemeTransitionItemDto {
  @IsUUID()
  @IsNotEmpty()
  fromStatusId: string;

  @IsUUID()
  @IsNotEmpty()
  toStatusId: string;

  @IsArray()
  @IsOptional()
  allowedRoles?: string[];

  @IsArray()
  @IsOptional()
  requiredFields?: string[];

  @IsBoolean()
  @IsOptional()
  requiresReleaseAssociation?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresQaSignoff?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresResolution?: boolean;

  @IsString()
  @IsOptional()
  manualGateName?: string;

  @IsString()
  @IsOptional()
  transitionNotesPrompt?: string;
}

export class ConfigureSchemeTransitionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchemeTransitionItemDto)
  transitions: SchemeTransitionItemDto[];
}

export class PublishWorkflowSchemeDto {
  @IsObject()
  @IsOptional()
  activeTaskRemapping?: Record<string, string>;
}

export class CloneWorkflowSchemeDto {
  @IsEnum(WorkflowScope)
  @IsNotEmpty()
  targetScope: WorkflowScope;

  @IsUUID()
  @IsOptional()
  targetProjectId?: string;

  @IsUUID()
  @IsOptional()
  targetProductId?: string;

  @IsString()
  @IsNotEmpty()
  newSchemeCode: string;

  @IsString()
  @IsNotEmpty()
  newSchemeName: string;
}
