import { IsUUID } from '../../../common/validators/record-id';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RequestPresignedUploadDto {
  @ApiProperty({
    example: 'TASK',
    enum: [
      'TASK',
      'TASK_COMMENT',
      'PROJECT',
      'PRODUCT',
      'CLIENT',
      'USER_AVATAR',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['TASK', 'TASK_COMMENT', 'PROJECT', 'PRODUCT', 'CLIENT', 'USER_AVATAR'])
  entityType: string;

  @ApiProperty({
    example: '4a123bc4-56de-78fa-90bc-def123456789',
    description:
      'Target Entity UUID (Task UUID, Project UUID, User UUID, etc.)',
  })
  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    example: 'staging_error_screenshot.png',
    description: 'Original file name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'image/png', description: 'MIME type of file' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @ApiProperty({
    example: 452810,
    description: 'File size in bytes (max 100MB)',
  })
  @IsInt()
  @Min(1)
  fileSizeBytes: number;

  @ApiPropertyOptional({
    example: 'Screenshot of 500 error on payment webhook handler',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
