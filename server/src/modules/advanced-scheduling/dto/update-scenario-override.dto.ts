import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional, IsString } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export class UpdateScenarioOverrideDto {
  @ApiPropertyOptional({
    example: "20000000-0000-0000-0000-0000000003e9",
    description: "Task UUID",
  })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiPropertyOptional({
    example: "2026-10-05",
    description: "Simulated start date",
  })
  @IsDateString()
  @IsOptional()
  simulatedStartDate?: string;

  @ApiPropertyOptional({
    example: "2026-10-15",
    description: "Simulated due date",
  })
  @IsDateString()
  @IsOptional()
  simulatedDueDate?: string;

  @ApiPropertyOptional({
    example: 16.0,
    description: "Simulated estimated hours",
  })
  @IsNumber()
  @IsOptional()
  simulatedEstimatedHours?: number;

  @ApiPropertyOptional({
    example: "HIGH",
    description: "Simulated task priority",
  })
  @IsString()
  @IsOptional()
  simulatedPriority?: string;

  @ApiPropertyOptional({
    example: "Accelerated due to parallel pairing on API endpoints",
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
