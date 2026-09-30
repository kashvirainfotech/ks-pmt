import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateChecklistItemDto {
  @IsNotEmpty()
  @IsEnum(['PENDING', 'PASSED', 'FAILED', 'WAIVED'])
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';

  @IsOptional()
  @IsString()
  evidenceNotes?: string;

  @IsOptional()
  @IsString()
  waivedReason?: string;
}

export class SignoffChecklistDto {
  @IsNotEmpty()
  @IsEnum(['NOT_STARTED', 'IN_REVIEW', 'READY_FOR_RELEASE', 'BLOCKED', 'CONDITIONAL_RELEASE'])
  overallStatus: 'NOT_STARTED' | 'IN_REVIEW' | 'READY_FOR_RELEASE' | 'BLOCKED' | 'CONDITIONAL_RELEASE';

  @IsOptional()
  @IsString()
  signoffNotes?: string;

  @IsOptional()
  @IsString()
  exceptionsNotes?: string;
}
