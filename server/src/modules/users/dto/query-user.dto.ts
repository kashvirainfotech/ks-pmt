import { IsUUID } from '../../../common/validators/record-id';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryUserDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by primary branch UUID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter by department UUID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by designation UUID' })
  @IsUUID()
  @IsOptional()
  designationId?: string;

  @ApiPropertyOptional({ description: 'Filter by role UUID' })
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Search by employee code, name, or email',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean = false;
}
