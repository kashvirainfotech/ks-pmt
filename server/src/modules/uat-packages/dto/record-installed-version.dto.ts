import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordInstalledVersionDto {
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsNotEmpty()
  @IsUUID()
  versionId: string;

  @IsNotEmpty()
  @IsString()
  environmentName: string;

  @IsOptional()
  @IsUUID()
  acceptedByContactId?: string;

  @IsOptional()
  @IsUUID()
  installedByUserId?: string;

  @IsOptional()
  @IsUUID()
  uatPackageId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
