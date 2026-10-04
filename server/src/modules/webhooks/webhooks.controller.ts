import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { DynamicRbacGuard } from "../rbac/rbac.guard";
import { Permissions } from "../rbac/rbac.decorator";
import { WebhooksService } from "./webhooks.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import {
  QueryDeliveriesDto,
  QuerySubscriptionsDto,
  SimulateEventDto,
} from "./dto/query-webhooks.dto";

@Controller("webhooks")
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================

  @Get("subscriptions")
  @Permissions("WEBHOOKS:READ")
  getSubscriptions(@Query() query: QuerySubscriptionsDto) {
    return this.webhooksService.getSubscriptions(query);
  }

  @Get("subscriptions/:id")
  @Permissions("WEBHOOKS:READ")
  getSubscriptionById(@Param("id") id: string) {
    return this.webhooksService.getSubscriptionById(id);
  }

  @Post("subscriptions")
  @Permissions("WEBHOOKS:MANAGE")
  createSubscription(@Body() dto: CreateSubscriptionDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.webhooksService.createSubscription(dto, userId);
  }

  @Patch("subscriptions/:id")
  @Permissions("WEBHOOKS:MANAGE")
  updateSubscription(
    @Param("id") id: string,
    @Body() dto: UpdateSubscriptionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.webhooksService.updateSubscription(id, dto, userId);
  }

  @Post("subscriptions/:id/rotate-secret")
  @Permissions("WEBHOOKS:MANAGE")
  rotateSecret(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.webhooksService.rotateSecret(id, userId);
  }

  @Delete("subscriptions/:id")
  @Permissions("WEBHOOKS:MANAGE")
  deleteSubscription(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.webhooksService.deleteSubscription(id, userId);
  }

  // ==========================================
  // TEST / SIMULATION
  // ==========================================

  @Post("simulate")
  @Permissions("WEBHOOKS:MANAGE")
  simulateEvent(@Body() dto: SimulateEventDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.webhooksService.simulateEvent(dto, userId);
  }

  // ==========================================
  // DELIVERY AUDIT & REPLAY
  // ==========================================

  @Get("deliveries")
  @Permissions("WEBHOOKS:READ")
  getDeliveries(@Query() query: QueryDeliveriesDto) {
    return this.webhooksService.getDeliveries(query);
  }

  @Post("deliveries/:id/replay")
  @Permissions("WEBHOOKS:REPLAY")
  replayDelivery(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.webhooksService.replayDelivery(id, userId);
  }
}
