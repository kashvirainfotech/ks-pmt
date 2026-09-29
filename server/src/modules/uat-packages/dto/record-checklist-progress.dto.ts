import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordChecklistProgressDto {
  @IsOptional()
  @IsBoolean()
  developerDone?: boolean;

  @IsOptional()
  @IsBoolean()
  qaVerified?: boolean;

  @IsOptional()
  @IsString()
  qaEvidenceNotes?: string;

  @IsOptional()
  @IsIn(['PENDING', 'PASSED', 'FAILED', 'BLOCKED', 'WAIVED'])
  clientStatus?: 'PENDING' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'WAIVED';

  @IsOptional()
  @IsString()
  clientFeedback?: string;

  @IsOptional()
  @IsUUID()
  linkedDefectTaskId?: string;
}
