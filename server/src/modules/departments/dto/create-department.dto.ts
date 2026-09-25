import { IsUUID } from '../../../common/validators/record-id';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'DEPT-ENG', description: 'Unique departmental code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  deptCode: string;

  @ApiProperty({
    example: 'Software Engineering',
    description: 'Department name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deptName: string;

  @ApiPropertyOptional({ example: 'Engineering and Product Development teams' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    description: 'Head of Department User UUID',
  })
  @IsUUID()
  @IsOptional()
  hodUserId?: string;
}
