import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IsUUID } from "../../../common/validators/record-id";

export const BLOCKER_CATEGORIES = [
  "TECHNICAL",
  "DEPENDENCY",
  "CLIENT",
  "ENVIRONMENT",
  "SPECIFICATION",
  "THIRD_PARTY",
  "RESOURCE",
  "OTHER",
] as const;

export type BlockerCategory = (typeof BLOCKER_CATEGORIES)[number];

export const BLOCKER_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type BlockerPriority = (typeof BLOCKER_PRIORITIES)[number];

export class CreateBlockerDto {
  @ApiProperty({ description: "Target task UUID being blocked" })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiPropertyOptional({ description: "User UUID accountable for unblocking" })
  @IsUUID()
  @IsOptional()
  ownerUserId?: string;

  @ApiPropertyOptional({ description: "Linked task UUID causing the block" })
  @IsUUID()
  @IsOptional()
  blockingTaskId?: string;

  @ApiProperty({
    example: "Waiting for third-party payment gateway staging credentials",
    description: "Detailed description of the blockage reason",
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    example: "Escalate to client vendor manager on Slack",
    description: "Immediate next step / mitigation plan",
  })
  @IsString()
  @IsOptional()
  nextAction?: string;

  @ApiPropertyOptional({ example: "2026-10-02T10:00:00Z" })
  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @ApiPropertyOptional({ example: "2026-10-03T18:00:00Z" })
  @IsDateString()
  @IsOptional()
  expectedResolutionDate?: string;

  @ApiPropertyOptional({
    enum: BLOCKER_CATEGORIES,
    default: "TECHNICAL",
    description: "Blocker root category",
  })
  @IsString()
  @IsOptional()
  @IsIn(BLOCKER_CATEGORIES)
  category?: BlockerCategory;

  @ApiPropertyOptional({
    enum: BLOCKER_PRIORITIES,
    default: "MEDIUM",
    description: "Blocker urgency / impact level",
  })
  @IsString()
  @IsOptional()
  @IsIn(BLOCKER_PRIORITIES)
  priority?: BlockerPriority;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
