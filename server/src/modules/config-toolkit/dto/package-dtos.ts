import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum PackageType {
  FULL = "FULL",
  WORKFLOWS_ONLY = "WORKFLOWS_ONLY",
  ROLES_PERMISSIONS = "ROLES_PERMISSIONS",
  TEMPLATES = "TEMPLATES",
  SLA_POLICIES = "SLA_POLICIES",
}

export class CreateConfigurationPackageDto {
  @ApiProperty({ example: "PKG-CUSTOM-001" })
  @IsString()
  @IsNotEmpty()
  packageCode: string;

  @ApiProperty({ example: "Standard Financial & Sprints Template" })
  @IsString()
  @IsNotEmpty()
  packageName: string;

  @ApiPropertyOptional({ example: "1.0.0", default: "1.0.0" })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ example: "FULL", enum: PackageType })
  @IsEnum(PackageType)
  @IsOptional()
  packageType?: PackageType;

  @ApiPropertyOptional({ example: "Custom exported package including workflows and SLA schemes." })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  manifest?: Record<string, any>;

  @ApiProperty()
  @IsObject()
  @IsNotEmpty()
  packageData: Record<string, any>;
}

export class ExportConfigurationDto {
  @ApiProperty({ example: "PKG-EXPORT-20261001" })
  @IsString()
  @IsNotEmpty()
  packageCode: string;

  @ApiProperty({ example: "Exported Live Configuration" })
  @IsString()
  @IsNotEmpty()
  packageName: string;

  @ApiPropertyOptional({ example: "FULL", enum: PackageType })
  @IsEnum(PackageType)
  @IsOptional()
  packageType?: PackageType;

  @ApiPropertyOptional({ example: "Snapshot of active workflows, task types, templates, and SLA rules." })
  @IsString()
  @IsOptional()
  description?: string;
}

export class DryRunPackageDto {
  @ApiPropertyOptional({ example: "pkg00000-0000-0000-0000-000000000001" })
  @IsString()
  @IsOptional()
  packageId?: string;

  @ApiPropertyOptional({ description: "Raw package JSON if uploading directly" })
  @IsObject()
  @IsOptional()
  rawPackageData?: Record<string, any>;
}

export class ApplyPackageDto {
  @ApiPropertyOptional({ example: "pkg00000-0000-0000-0000-000000000001" })
  @IsString()
  @IsOptional()
  packageId?: string;

  @ApiPropertyOptional({ description: "Raw package JSON if uploading directly" })
  @IsObject()
  @IsOptional()
  rawPackageData?: Record<string, any>;

  @ApiPropertyOptional({
    example: "OVERWRITE",
    enum: ["OVERWRITE", "SKIP", "FAIL_ON_CONFLICT"],
    default: "SKIP",
  })
  @IsString()
  @IsOptional()
  conflictResolution?: "OVERWRITE" | "SKIP" | "FAIL_ON_CONFLICT";
}
