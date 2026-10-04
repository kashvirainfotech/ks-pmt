import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  MaxLength,
  IsDateString,
} from 'class-validator';

export enum IssueObservationType {
  FOUND_REPRODUCED = 'FOUND_REPRODUCED',
  FIX_AVAILABLE = 'FIX_AVAILABLE',
  READY_FOR_RETEST = 'READY_FOR_RETEST',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CANNOT_REPRODUCE = 'CANNOT_REPRODUCE',
  BLOCKED = 'BLOCKED',
}

export class CreateIssueObservationDto {
  @IsUUID()
  @IsNotEmpty()
  task_id: string;

  @IsUUID()
  @IsNotEmpty()
  environment_id: string;

  @IsUUID()
  @IsNotEmpty()
  version_id: string;

  @IsEnum(IssueObservationType)
  @IsNotEmpty()
  observation_type: IssueObservationType;

  @IsDateString()
  @IsOptional()
  observed_at?: string;

  @IsUUID()
  @IsOptional()
  tester_user_id?: string;

  @IsUUID()
  @IsOptional()
  client_contact_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  browser_info?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  os_info?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  device_info?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  build_label?: string;

  @IsString()
  @IsOptional()
  evidence_notes?: string;

  @IsString()
  @IsOptional()
  attachment_url?: string;

  @IsBoolean()
  @IsOptional()
  is_client_visible?: boolean;
}
