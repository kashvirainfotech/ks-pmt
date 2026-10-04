import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateCompanySettingsDto {
  @ApiProperty({ example: "Kashvira Infotech Private Limited" })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional({ example: "Kashvira Infotech Solutions Pvt. Ltd." })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({ example: "U72200MH2020PTC123456" })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({ example: "27AAAAA0000A1Z5" })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({ example: "kashvirainfotech.com" })
  @IsString()
  @IsOptional()
  companyDomain?: string;

  @ApiPropertyOptional({ example: "admin@kashvirainfotech.com" })
  @IsString()
  @IsOptional()
  primaryEmail?: string;

  @ApiPropertyOptional({ example: "support@kashvirainfotech.com" })
  @IsString()
  @IsOptional()
  supportEmail?: string;

  @ApiPropertyOptional({ example: "11111111-1111-1111-1111-111111111111" })
  @IsUUID("all")
  @IsOptional()
  headquartersBranchId?: string;

  @ApiPropertyOptional({ example: "INR", default: "INR" })
  @IsString()
  @IsOptional()
  defaultCurrency?: string;

  @ApiPropertyOptional({ example: "Asia/Kolkata", default: "Asia/Kolkata" })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: "YYYY-MM-DD", default: "YYYY-MM-DD" })
  @IsString()
  @IsOptional()
  dateFormat?: string;

  @ApiPropertyOptional({ example: "#2563eb", default: "#2563eb" })
  @IsString()
  @IsOptional()
  brandingPrimaryColor?: string;

  @ApiPropertyOptional({ example: "#4f46e5", default: "#4f46e5" })
  @IsString()
  @IsOptional()
  brandingAccentColor?: string;

  @ApiPropertyOptional({ example: "https://cdn.kashvirainfotech.com/logo.png" })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: "https://cdn.kashvirainfotech.com/favicon.ico" })
  @IsString()
  @IsOptional()
  faviconUrl?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  setupWizardCompleted?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @Max(6)
  @IsOptional()
  setupWizardStep?: number;

  @ApiPropertyOptional({
    description: "Map of enabled modules within the single-company installation",
  })
  @IsObject()
  @IsOptional()
  enabledModules?: Record<string, boolean>;
}
