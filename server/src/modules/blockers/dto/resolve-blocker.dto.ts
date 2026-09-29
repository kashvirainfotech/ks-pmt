import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class ResolveBlockerDto {
  @ApiPropertyOptional({
    enum: ["RESOLVED", "DISMISSED"],
    default: "RESOLVED",
    description: "Resolution outcome status",
  })
  @IsString()
  @IsOptional()
  @IsIn(["RESOLVED", "DISMISSED"])
  status?: "RESOLVED" | "DISMISSED";

  @ApiPropertyOptional({
    example: "Credentials received from client and tested successfully in staging",
    description: "Notes summarizing how the blocker was resolved",
  })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}
