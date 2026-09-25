import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'BR-BLR-01', description: 'Unique code for the branch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  branchCode: string;

  @ApiProperty({ example: 'Bengaluru Development Center', description: 'Name of the branch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  branchName: string;

  @ApiProperty({ example: 'Tower B, Outer Ring Road', description: 'Primary address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Tech Park, Marathahalli', description: 'Secondary address' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ example: 'Bengaluru', description: 'City' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Karnataka', description: 'State' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: '560103', description: 'Postal / ZIP code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;

  @ApiPropertyOptional({ example: '+91 80 4100 0000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'blr@kashvirainfotech.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 12.9279, description: 'GPS Latitude coordinate' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.6271, description: 'GPS Longitude coordinate' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 250, default: 200, description: 'Geofencing radius in meters' })
  @IsNumber()
  @Min(50)
  @IsOptional()
  geofenceRadiusMeters?: number;

  @ApiPropertyOptional({ example: false, default: false, description: 'Whether this is the corporate head office' })
  @IsBoolean()
  @IsOptional()
  isHeadOffice?: boolean;
}
