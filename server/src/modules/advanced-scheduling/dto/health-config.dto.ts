import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNumber, IsOptional } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export const MISSING_DATA_STRATEGIES = [
  "NEUTRAL_SCORE",
  "EXCLUDE_DIMENSION",
  "STRICT_PENALTY",
] as const;

export type MissingDataStrategy = (typeof MISSING_DATA_STRATEGIES)[number];

export class UpsertHealthConfigDto {
  @ApiPropertyOptional({
    description: "Project UUID. If null, applies as global organization default.",
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    example: 30.0,
    description: "Weight for Schedule dimension (0-100)",
  })
  @IsNumber()
  weightSchedule: number;

  @ApiProperty({
    example: 20.0,
    description: "Weight for Scope dimension (0-100)",
  })
  @IsNumber()
  weightScope: number;

  @ApiProperty({
    example: 20.0,
    description: "Weight for Quality dimension (0-100)",
  })
  @IsNumber()
  weightQuality: number;

  @ApiProperty({
    example: 15.0,
    description: "Weight for Blockers dimension (0-100)",
  })
  @IsNumber()
  weightBlockers: number;

  @ApiProperty({
    example: 15.0,
    description: "Weight for Budget & Flow dimension (0-100)",
  })
  @IsNumber()
  weightBudgetFlow: number;

  @ApiPropertyOptional({
    example: 3,
    description: "Days of schedule slip before warning triggered",
  })
  @IsNumber()
  @IsOptional()
  scheduleSlipWarningDays?: number;

  @ApiPropertyOptional({
    example: 7,
    description: "Days of schedule slip before critical alert triggered",
  })
  @IsNumber()
  @IsOptional()
  scheduleSlipCriticalDays?: number;

  @ApiPropertyOptional({
    example: 0.25,
    description: "Critical ratio of open bugs to total active tasks",
  })
  @IsNumber()
  @IsOptional()
  defectDensityCriticalRatio?: number;

  @ApiPropertyOptional({
    example: 48.0,
    description: "Critical threshold for unresolved blocker age in hours",
  })
  @IsNumber()
  @IsOptional()
  blockerAgeCriticalHours?: number;

  @ApiPropertyOptional({
    enum: MISSING_DATA_STRATEGIES,
    example: "NEUTRAL_SCORE",
  })
  @IsIn(MISSING_DATA_STRATEGIES)
  @IsOptional()
  missingDataStrategy?: MissingDataStrategy;
}
