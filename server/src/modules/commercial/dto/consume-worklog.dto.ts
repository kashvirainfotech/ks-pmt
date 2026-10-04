import { IsNotEmpty, IsUUID, IsOptional, IsNumber, Min } from 'class-validator';

export class ConsumeWorklogDto {
  @IsNotEmpty()
  @IsUUID()
  timeLogId: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  hoursConsumed?: number;
}
