import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export const SCENARIO_TYPES = [
  "DATE_SHIFT",
  "CAPACITY_REDUCTION",
  "SCOPE_EXPANSION",
  "PRIORITY_RESHUFFLE",
  "CRITICAL_PATH_OPTIMIZATION",
  "CUSTOM",
] as const;

export type ScenarioType = (typeof SCENARIO_TYPES)[number];

export class CreateScenarioDto {
  @ApiProperty({
    example: "00000000-0000-0000-0000-000000000001",
    description: "Project UUID to which this scenario belongs",
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    example: "SCEN-LOG-OPT-02",
    description: "Unique scenario code within project",
  })
  @IsString()
  @IsNotEmpty()
  scenarioCode: string;

  @ApiProperty({
    example: "Q4 Frontend Acceleration Simulation",
    description: "Human-readable scenario title",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "Simulating addition of 2 contract developers to pull in release date by 10 days",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: SCENARIO_TYPES,
    example: "CRITICAL_PATH_OPTIMIZATION",
    description: "Classification of what-if scenario",
  })
  @IsIn(SCENARIO_TYPES)
  @IsNotEmpty()
  scenarioType: ScenarioType;
}
