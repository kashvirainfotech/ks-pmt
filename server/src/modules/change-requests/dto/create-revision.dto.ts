import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRevisionDto {
  @IsNotEmpty()
  @IsString()
  scopeDescription: string;

  @IsOptional()
  @IsArray()
  deliverables?: Array<{ title: string; description?: string; targetDate?: string }>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quotedPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scheduleDelayDays?: number;

  @IsOptional()
  @IsString()
  revisedDeliveryDate?: string;

  @IsNotEmpty()
  @IsString()
  revisionReason: string;

  @IsOptional()
  @IsBoolean()
  submitForInternalReview?: boolean;
}
