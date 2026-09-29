import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectGrantItemDto } from './invite-contact.dto';

export class UpdateProjectGrantsDto {
  @ApiProperty({ type: [ProjectGrantItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectGrantItemDto)
  grants: ProjectGrantItemDto[];
}
