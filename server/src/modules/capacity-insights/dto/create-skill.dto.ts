import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateSkillDto {
  @IsOptional()
  @IsString()
  skill_code?: string;

  @IsString()
  @IsNotEmpty()
  skill_name: string;

  @IsEnum([
    'FRONTEND',
    'BACKEND',
    'DATABASE',
    'DEVOPS',
    'QA_TESTING',
    'MOBILE',
    'ARCHITECTURE',
    'SECURITY',
    'DATA_ANALYTICS',
    'PRODUCT_DESIGN',
  ])
  category: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignUserSkillDto {
  @IsString()
  @IsNotEmpty()
  skill_id: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
  proficiency_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

  @IsOptional()
  years_experience?: number;
}

export class SetTaskRequiredSkillDto {
  @IsString()
  @IsNotEmpty()
  skill_id: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
  min_proficiency_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

  @IsEnum(['REQUIRED', 'PREFERRED'])
  importance: 'REQUIRED' | 'PREFERRED';
}
