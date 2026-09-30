import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ExecuteTestRunItemDto {
  @IsNotEmpty()
  @IsEnum(['PENDING', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'])
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsString()
  executionNotes?: string;

  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];

  @IsOptional()
  @IsUUID()
  linkedDefectTaskId?: string;
}

export class LogDefectFromRunItemDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  sprintId?: string;
}
