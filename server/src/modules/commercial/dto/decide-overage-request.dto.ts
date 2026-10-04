import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, IsEnum, Min } from 'class-validator';

export enum OverageDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WAIVED = 'WAIVED',
}

export class DecideOverageRequestDto {
  @IsNotEmpty()
  @IsEnum(OverageDecision)
  decision: OverageDecision;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedHours?: number;

  @IsOptional()
  @IsUUID()
  approvedByContactId?: string;

  @IsOptional()
  @IsString()
  clientRemarks?: string;
}
