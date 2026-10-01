import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
}

export class CreateRecurrenceRuleDto {
  @IsString()
  @IsOptional()
  ruleCode?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  taskTemplateId?: string;

  @IsEnum(RecurrenceFrequency)
  @IsNotEmpty()
  frequency: RecurrenceFrequency;

  @IsInt()
  @Min(1)
  @IsOptional()
  intervalCount?: number;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  monthOfYear?: number;

  @IsDateString()
  @IsNotEmpty()
  nextRunDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxOccurrences?: number;

  @IsUUID()
  @IsOptional()
  defaultAssigneeUserId?: string;

  @IsString()
  @IsOptional()
  defaultPriority?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateRecurrenceRuleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  taskTemplateId?: string;

  @IsEnum(RecurrenceFrequency)
  @IsOptional()
  frequency?: RecurrenceFrequency;

  @IsInt()
  @Min(1)
  @IsOptional()
  intervalCount?: number;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  monthOfYear?: number;

  @IsDateString()
  @IsOptional()
  nextRunDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxOccurrences?: number;

  @IsUUID()
  @IsOptional()
  defaultAssigneeUserId?: string;

  @IsString()
  @IsOptional()
  defaultPriority?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TriggerRecurrenceRuleDto {
  @IsDateString()
  @IsOptional()
  targetDate?: string; // Optional override for scheduled occurrence date
}
