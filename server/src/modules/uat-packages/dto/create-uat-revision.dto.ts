import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateUatChecklistItemInput } from './create-uat-package.dto';

export class CreateUatRevisionDto {
  @IsNotEmpty()
  @IsString()
  revisionNotes: string;

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

  @IsOptional()
  @IsBoolean()
  submitForInternalQa?: boolean;
}
