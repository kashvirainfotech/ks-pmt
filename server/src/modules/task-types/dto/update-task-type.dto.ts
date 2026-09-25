import { PartialType } from '@nestjs/swagger';
import { CreateTaskTypeDto } from './create-task-type.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTaskTypeDto extends PartialType(CreateTaskTypeDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
