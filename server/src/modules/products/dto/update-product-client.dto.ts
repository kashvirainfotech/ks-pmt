import { PartialType } from '@nestjs/swagger';
import { MapProductClientDto } from './map-product-client.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProductClientDto extends PartialType(MapProductClientDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
