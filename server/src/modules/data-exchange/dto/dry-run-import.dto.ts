import { IsNotEmpty, IsString, IsEnum, IsOptional, IsObject, IsArray } from 'class-validator';

export enum ImportEntityType {
  TASKS = 'TASKS',
  CLIENTS = 'CLIENTS',
  PROJECTS = 'PROJECTS',
  TIME_LOGS = 'TIME_LOGS',
  USERS = 'USERS',
  REQUIREMENTS = 'REQUIREMENTS',
  TEST_CASES = 'TEST_CASES',
}

export enum ImportMode {
  CREATE_ONLY = 'CREATE_ONLY',
  UPDATE_ONLY = 'UPDATE_ONLY',
  UPSERT = 'UPSERT',
}

export class DryRunImportDto {
  @IsNotEmpty()
  @IsEnum(ImportEntityType)
  entityType: ImportEntityType;

  @IsOptional()
  @IsEnum(ImportMode)
  importMode?: ImportMode;

  @IsNotEmpty()
  @IsString()
  originalFilename: string;

  @IsNotEmpty()
  @IsString()
  csvContent: string;

  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, string>;
}
