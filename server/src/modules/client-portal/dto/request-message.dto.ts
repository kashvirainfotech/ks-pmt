import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRequestMessageDto {
  @ApiProperty({ example: 'Could you please confirm if this also happens in Chrome?' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Internal-only comment, invisible to the client contact',
  })
  @IsBoolean()
  @IsOptional()
  isInternalOnly?: boolean = false;

  @ApiPropertyOptional({
    description: 'Uploaded attachment metadata stored in S3',
    type: 'array',
  })
  @IsArray()
  @IsOptional()
  attachments?: Array<{
    s3Key: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
}

export class QueryRequestsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  requestType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;
}
