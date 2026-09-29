import { PartialType } from '@nestjs/swagger';
import { CreateCalendarDto } from './create-calendar.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCalendarDto extends PartialType(CreateCalendarDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
