import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export class ScenarioQueryDto {
  @ApiPropertyOptional({
    description: "Filter by project UUID",
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: "Filter by scenario status (DRAFT, SIMULATED, APPLIED, ARCHIVED)",
  })
  @IsString()
  @IsOptional()
  status?: string;
}
