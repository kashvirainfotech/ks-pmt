import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class AddKnowledgeAttachmentDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  s3Key: string;

  @IsOptional()
  @IsString()
  s3Bucket?: string = 'ks-pmt-documents';

  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @IsNotEmpty()
  @IsInt()
  fileSizeBytes: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  revisionNumber?: number = 1;
}
