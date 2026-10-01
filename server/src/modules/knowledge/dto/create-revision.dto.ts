import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateKnowledgeRevisionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsNotEmpty()
  @IsString()
  contentMarkdown: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;
}
