import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateVersionDto } from './create-version.dto';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class UpdateVersionDto extends PartialType(CreateVersionDto) {
  @ApiPropertyOptional({ example: '2026-10-29' })
  @IsDateString()
  @IsOptional()
  actualReleaseDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
