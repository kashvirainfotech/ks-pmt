import { IsNotEmpty, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ImportEntityType } from './dry-run-import.dto';

export class ExportQueryDto {
  @IsNotEmpty()
  @IsEnum(ImportEntityType)
  entityType: ImportEntityType;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  format?: 'CSV' | 'JSON';
}
