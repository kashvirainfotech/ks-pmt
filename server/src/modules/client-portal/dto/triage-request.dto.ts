import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class TriageRequestDto {
  @ApiPropertyOptional({
    enum: [
      'SUBMITTED',
      'UNDER_REVIEW',
      'NEEDS_INFORMATION',
      'ACCEPTED',
      'DUPLICATE',
      'DECLINED',
    ],
  })
  @IsEnum([
    'SUBMITTED',
    'UNDER_REVIEW',
    'NEEDS_INFORMATION',
    'ACCEPTED',
    'DUPLICATE',
    'DECLINED',
  ])
  @IsOptional()
  status?:
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'NEEDS_INFORMATION'
    | 'ACCEPTED'
    | 'DUPLICATE'
    | 'DECLINED';

  @ApiPropertyOptional({
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    description: 'Internal development/PM priority',
  })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  @IsOptional()
  internalPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({
    enum: ['TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'],
    description: 'Technical severity assessed by QA/Engineering',
  })
  @IsEnum(['TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
  @IsOptional()
  technicalSeverity?: 'TRIVIAL' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';

  @ApiPropertyOptional({
    enum: [
      'OPERATIONS',
      'REVENUE',
      'COMPLIANCE',
      'SECURITY',
      'USABILITY',
      'PERFORMANCE',
      'REPORTING',
      'OTHER',
    ],
  })
  @IsEnum([
    'OPERATIONS',
    'REVENUE',
    'COMPLIANCE',
    'SECURITY',
    'USABILITY',
    'PERFORMANCE',
    'REPORTING',
    'OTHER',
  ])
  @IsOptional()
  businessImpact?:
    | 'OPERATIONS'
    | 'REVENUE'
    | 'COMPLIANCE'
    | 'SECURITY'
    | 'USABILITY'
    | 'PERFORMANCE'
    | 'REPORTING'
    | 'OTHER';

  @ApiPropertyOptional({
    enum: [
      'INTERNAL',
      'SINGLE_USER',
      'ORGANIZATION',
      'MULTIPLE_CLIENTS',
      'ALL_CLIENTS',
    ],
  })
  @IsEnum([
    'INTERNAL',
    'SINGLE_USER',
    'ORGANIZATION',
    'MULTIPLE_CLIENTS',
    'ALL_CLIENTS',
  ])
  @IsOptional()
  impactBreadth?:
    | 'INTERNAL'
    | 'SINGLE_USER'
    | 'ORGANIZATION'
    | 'MULTIPLE_CLIENTS'
    | 'ALL_CLIENTS';

  @ApiPropertyOptional({ description: 'Required reason if request is DECLINED' })
  @IsString()
  @IsOptional()
  rejectionOrDeclineReason?: string;

  @ApiPropertyOptional({ description: 'Target request ID if this is a DUPLICATE' })
  @IsUUID()
  @IsOptional()
  duplicateOfRequestId?: string;

  @ApiPropertyOptional({ description: 'Existing internal delivery task ID' })
  @IsUUID()
  @IsOptional()
  linkedTaskId?: string;

  @ApiPropertyOptional({ example: 'v2.4.0' })
  @IsString()
  @IsOptional()
  affectedVersion?: string;

  @ApiPropertyOptional({ example: 'v2.4.1' })
  @IsString()
  @IsOptional()
  targetFixVersion?: string;

  @ApiPropertyOptional({ description: 'Internal triage note' })
  @IsString()
  @IsOptional()
  notes?: string;
}
