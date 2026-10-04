import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class FirstResponseActionDto {
  @IsBoolean()
  isCustomerVisible: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ResolutionActionDto {
  @IsString()
  @IsNotEmpty()
  terminalStatusCategory: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PauseCycleDto {
  @IsString()
  @IsNotEmpty()
  pauseReason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ExtendDeadlineDto {
  @IsInt()
  @Min(1)
  addedMinutes: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  changeRequestId?: string;
}

export class AcknowledgeAlertDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ResolveAlertDto {
  @IsString()
  @IsNotEmpty()
  resolutionNotes: string;
}
