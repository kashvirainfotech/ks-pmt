import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateOverageRequestDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.1)
  requestedOverageHours: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsNotEmpty()
  @IsString()
  justification: string;

  @IsOptional()
  @IsUUID()
  changeRequestId?: string;
}
