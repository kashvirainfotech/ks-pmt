import { PartialType } from '@nestjs/swagger';
import { CreateStatusDto } from './create-status.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateStatusDto extends PartialType(CreateStatusDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
