import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export class RecordHealthOverrideDto {
  @ApiProperty({
    example: "00000000-0000-0000-0000-000000000001",
    description: "Project UUID",
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({
    example: "AMBER",
    enum: ["GREEN", "AMBER", "RED"],
    description: "Manual override state for project health (or null to clear)",
  })
  @IsIn(["GREEN", "AMBER", "RED"])
  @IsOptional()
  overrideState?: "GREEN" | "AMBER" | "RED";

  @ApiProperty({
    example: "Key stakeholder requested extra UAT soak testing before milestone release",
    description: "Attributable justification for health score override",
  })
  @IsString()
  @IsNotEmpty()
  overrideReason: string;
}
