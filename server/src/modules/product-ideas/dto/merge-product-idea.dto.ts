import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class MergeProductIdeaDto {
  @IsUUID()
  @IsNotEmpty()
  canonicalIdeaId: string;

  @IsOptional()
  @IsString()
  mergeNotes?: string;
}
