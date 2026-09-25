import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'CL-TECH-01', description: 'Unique client / prospect code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  clientCode: string;

  @ApiProperty({ example: 'AcroPulse Technologies Ltd.', description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName: string;

  @ApiProperty({ example: 'Vikramaditya Shah', description: 'Primary contact person' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  contactPerson: string;

  @ApiPropertyOptional({ example: 'Chief Technology Officer' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  designation?: string;

  @ApiProperty({ example: 'vikram@acropulse.com', description: 'Official email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+919825012345', description: 'Mobile / WhatsApp phone' })
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @ApiPropertyOptional({ example: '+91 79 2650 1111' })
  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'https://acropulse.com' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: '801 Shapath V, SG Highway' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Ahmedabad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Gujarat' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: '380015' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: '24AAACC1206D1ZH', description: 'Tax Identification Number or GST' })
  @IsString()
  @IsOptional()
  taxIdOrGst?: string;

  @ApiPropertyOptional({
    example: 'PROSPECT',
    enum: ['PROSPECT', 'ACTIVE_CLIENT', 'FORMER_CLIENT'],
    default: 'PROSPECT',
  })
  @IsString()
  @IsOptional()
  @IsIn(['PROSPECT', 'ACTIVE_CLIENT', 'FORMER_CLIENT'])
  clientType?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000001', description: 'Assigned Account Manager User UUID' })
  @IsUUID()
  @IsOptional()
  accountManagerUserId?: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111', description: 'Associated Branch UUID' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;
}
