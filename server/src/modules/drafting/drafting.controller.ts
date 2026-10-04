import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { DynamicRbacGuard } from "../rbac/rbac.guard";
import { Permissions } from "../rbac/rbac.decorator";
import { DraftingService } from "./drafting.service";
import {
  GenerateDraftDto,
  QueryDraftsDto,
  ReviewDraftDto,
  UpdateRuleConfigDto,
} from "./dto/draft-dtos";

@ApiTags("Drafting & Summaries (LATER-002)")
@Controller("drafting")
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class DraftingController {
  constructor(private readonly draftingService: DraftingService) {}

  @Get("suggestions")
  @Permissions("DRAFTING:READ")
  getDrafts(@Query() query: QueryDraftsDto) {
    return this.draftingService.getDrafts(query);
  }

  @Get("suggestions/:id")
  @Permissions("DRAFTING:READ")
  getDraftById(@Param("id") id: string) {
    return this.draftingService.getDraftById(id);
  }

  @Post("generate")
  @Permissions("DRAFTING:GENERATE")
  generateDraft(@Body() dto: GenerateDraftDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.draftingService.generateDraft(dto, userId);
  }

  @Post("suggestions/:id/review")
  @Permissions("DRAFTING:REVIEW")
  reviewDraft(
    @Param("id") id: string,
    @Body() dto: ReviewDraftDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.draftingService.reviewDraft(id, dto, userId);
  }

  @Get("rules")
  @Permissions("DRAFTING:READ")
  getRuleConfigs() {
    return this.draftingService.getRuleConfigs();
  }

  @Put("rules/:id")
  @Permissions("DRAFTING:REVIEW")
  updateRuleConfig(
    @Param("id") id: string,
    @Body() dto: UpdateRuleConfigDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.draftingService.updateRuleConfig(id, dto, userId);
  }
}
