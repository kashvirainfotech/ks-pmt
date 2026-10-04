import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsDateString, IsEnum } from 'class-validator';

export enum PeriodStatus {
  UPCOMING = 'UPCOMING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RECONCILED = 'RECONCILED',
}

export class CreateContractPeriodDto {
  @IsOptional()
  @IsString()
  periodCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  periodSequence?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  includedHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rolledOverHoursIn?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overageHourlyRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PeriodStatus)
  status?: PeriodStatus;

  @IsOptional()
  @IsString()
  reconciledNotes?: string;
}
