import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export const TASK_LINK_TYPES = [
  "FINISH_TO_START",
  "START_TO_START",
  "FINISH_TO_FINISH",
  "START_TO_FINISH",
  "BLOCKS",
  "RELATED_TO",
  "DUPLICATE_OF",
  "CAUSES",
  "FIXED_BY",
  "TESTED_BY",
  "RELEASED_IN",
] as const;

export type TaskLinkType = (typeof TASK_LINK_TYPES)[number];

export class CreateDependencyDto {
  @ApiProperty({
    example: "11111111-1111-1111-1111-111111111111",
    description: "Source Task UUID (prerequisite or antecedent)",
  })
  @IsUUID()
  @IsNotEmpty()
  sourceTaskId: string;

  @ApiProperty({
    example: "22222222-2222-2222-2222-222222222222",
    description: "Target Task UUID (dependent or consequent)",
  })
  @IsUUID()
  @IsNotEmpty()
  targetTaskId: string;

  @ApiProperty({
    enum: TASK_LINK_TYPES,
    example: "FINISH_TO_START",
    description:
      "Type of relationship. Directed scheduling links (FINISH_TO_START, BLOCKS) enforce DAG cycle checks.",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(TASK_LINK_TYPES)
  linkType: TaskLinkType;

  @ApiPropertyOptional({
    example: 8.0,
    description: "Lead/Lag duration (positive for waiting delay, negative for lead/overlap)",
  })
  @IsNumber()
  @IsOptional()
  lagDurationHours?: number;

  @ApiPropertyOptional({
    example: "HOURS",
    enum: ["HOURS", "DAYS"],
    description: "Unit of lag duration",
  })
  @IsIn(["HOURS", "DAYS"])
  @IsOptional()
  lagUnit?: "HOURS" | "DAYS";

  @ApiPropertyOptional({
    example: "Backend authentication API must be merged before Frontend login page can be tested",
  })
  @IsString()
  @IsOptional()
  description?: string;
}
