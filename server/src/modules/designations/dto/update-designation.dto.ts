import { PartialType } from '@nestjs/swagger';
import { CreateDesignationDto } from './create-designation.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDesignationDto extends PartialType(CreateDesignationDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
