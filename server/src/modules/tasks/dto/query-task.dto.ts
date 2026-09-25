import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryTaskDto {
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

  @ApiPropertyOptional({ description: 'Filter by Project UUID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by Product UUID' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Filter by Version UUID' })
  @IsUUID()
  @IsOptional()
  versionId?: string;

  @ApiPropertyOptional({ description: 'Filter by Task Type UUID' })
  @IsUUID()
  @IsOptional()
  taskTypeId?: string;

  @ApiPropertyOptional({ description: 'Filter by Task Status UUID' })
  @IsUUID()
  @IsOptional()
  statusId?: string;

  @ApiPropertyOptional({ example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'] })
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: 'Filter by Assignee User UUID' })
  @IsUUID()
  @IsOptional()
  assigneeUserId?: string;

  @ApiPropertyOptional({ description: 'Filter by Branch UUID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter chargeable tasks only' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isChargeable?: boolean;

  @ApiPropertyOptional({ description: 'Search task title or code' })
  @IsString()
  @IsOptional()
  search?: string;
}
