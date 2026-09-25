import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryClientDto {
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

  @ApiPropertyOptional({ example: 'ACTIVE_CLIENT', enum: ['PROSPECT', 'ACTIVE_CLIENT', 'FORMER_CLIENT'] })
  @IsString()
  @IsIn(['PROSPECT', 'ACTIVE_CLIENT', 'FORMER_CLIENT'])
  @IsOptional()
  clientType?: string;

  @ApiPropertyOptional({ description: 'Filter by Branch UUID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter by Account Manager User UUID' })
  @IsUUID()
  @IsOptional()
  accountManagerUserId?: string;

  @ApiPropertyOptional({ description: 'Search company name, contact person, or email' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean = false;
}
