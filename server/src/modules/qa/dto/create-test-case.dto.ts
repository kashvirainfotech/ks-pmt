import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class TestCaseStepDto {
  @IsInt()
  @Min(1)
  stepNumber: number;

  @IsNotEmpty()
  @IsString()
  action: string;

  @IsNotEmpty()
  @IsString()
  expectedResult: string;
}

export class CreateTestCaseDto {
  @IsOptional()
  @IsString()
  caseCode?: string;

  @IsNotEmpty()
  @IsUUID()
  suiteId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  preconditions?: string;

  @IsArray()
  testSteps: TestCaseStepDto[];

  @IsNotEmpty()
  @IsString()
  expectedResult: string;

  @IsOptional()
  @IsEnum(['TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
  severity?: 'TRIVIAL' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsEnum(['MANUAL', 'AUTOMATED'])
  executionType?: 'MANUAL' | 'AUTOMATED';

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsUUID()
  requirementCriterionId?: string;

  @IsOptional()
  @IsUUID()
  componentId?: string;
}

export class UpdateTestCaseDto {
  @IsOptional()
  @IsUUID()
  suiteId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  preconditions?: string;

  @IsOptional()
  @IsArray()
  testSteps?: TestCaseStepDto[];

  @IsOptional()
  @IsString()
  expectedResult?: string;

  @IsOptional()
  @IsEnum(['TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
  severity?: 'TRIVIAL' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsEnum(['MANUAL', 'AUTOMATED'])
  executionType?: 'MANUAL' | 'AUTOMATED';

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsUUID()
  requirementCriterionId?: string;

  @IsOptional()
  @IsUUID()
  componentId?: string;
}
