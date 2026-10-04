import { IsOptional, IsEnum } from 'class-validator';
import { ImportMode } from './dry-run-import.dto';

export class ExecuteImportDto {
  @IsOptional()
  @IsEnum(ImportMode)
  importMode?: ImportMode;
}
