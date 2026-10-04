import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateCurrencyExchangeRateDto {
  @IsString()
  @IsNotEmpty()
  from_currency: string;

  @IsString()
  @IsNotEmpty()
  to_currency: string;

  @IsNumber()
  @Min(0.000001)
  exchange_rate: number;

  @IsDateString()
  @IsOptional()
  effective_date?: string;

  @IsString()
  @IsOptional()
  source?: string;
}
