import { PartialType } from '@nestjs/mapped-types';
import { CreateRaidItemDto } from './create-raid-item.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateRaidItemDto extends PartialType(CreateRaidItemDto) {
  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsUUID()
  supersededById?: string;
}
