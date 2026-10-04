import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, IsEnum, Min, IsDateString } from 'class-validator';

export enum ContractType {
  RETAINER = 'RETAINER',
  AMC = 'AMC',
  TIME_AND_MATERIALS_CAP = 'TIME_AND_MATERIALS_CAP',
  FIXED_HOURS_BUCKET = 'FIXED_HOURS_BUCKET',
}

export enum Periodicity {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
  CUSTOM = 'CUSTOM',
}

export enum RolloverRule {
  NO_ROLLOVER = 'NO_ROLLOVER',
  FULL_ROLLOVER = 'FULL_ROLLOVER',
  CAPPED_ROLLOVER = 'CAPPED_ROLLOVER',
  EXPIRE_AFTER_N_PERIODS = 'EXPIRE_AFTER_N_PERIODS',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING_RENEWAL = 'PENDING_RENEWAL',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export class CreateContractDto {
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsEnum(ContractType)
  contractType: ContractType;

  @IsNotEmpty()
  @IsEnum(Periodicity)
  periodicity: Periodicity;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  includedHoursPerPeriod: number;

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
  @IsEnum(RolloverRule)
  rolloverRule?: RolloverRule;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRolloverHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rolloverExpiryPeriods?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsUUID()
  accountablePmUserId?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  autoCreateFirstPeriod?: boolean;
}
