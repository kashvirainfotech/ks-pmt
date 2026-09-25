import { IsIn, IsOptional, IsString } from 'class-validator';
export class ReviewTimeLogDto {
  @IsIn(['APPROVED', 'REJECTED']) status: string;
  @IsOptional() @IsString() remarks?: string;
}
