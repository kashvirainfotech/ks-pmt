import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateUatChecklistItemInput {
  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  instructions: string;

  @IsNotEmpty()
  @IsString()
  expectedOutcome: string;

  @IsOptional()
  @IsUUID()
  criterionId?: string;

  @IsOptional()
  orderIndex?: number;
}

export class CreateUatPackageDto {
  @IsOptional()
  @IsString()
  packageCode?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  versionId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  environmentUrl?: string;

  @IsOptional()
  @IsString()
  buildNumber?: string;

  @IsOptional()
  @IsString()
  testCredentialsInstructions?: string;

  @IsOptional()
  @IsDateString()
  targetSignoffDate?: string;

  @IsOptional()
  @IsUUID()
  qaLeadUserId?: string;

  // Initial Revision details
  @IsOptional()
  @IsString()
  revisionNotes?: string;

  @IsOptional()
  @IsArray()
  knownIssues?: Array<{
    title: string;
    workaround?: string;
    severity?: string;
    linkedTaskId?: string;
  }>;

  @IsOptional()
  @IsArray()
  testEvidenceUrls?: string[];

  @IsOptional()
  @IsArray()
  checklistItems?: CreateUatChecklistItemInput[];
}
