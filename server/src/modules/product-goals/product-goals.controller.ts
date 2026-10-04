import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicRbacGuard as PermissionsGuard } from '../rbac/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ProductGoalsService } from './product-goals.service';
import { CreateProductGoalDto } from './dto/create-product-goal.dto';
import { UpdateProductGoalDto } from './dto/update-product-goal.dto';
import { CreateOutcomeReviewDto } from './dto/create-outcome-review.dto';
import {
  QueryProductGoalsDto,
  QueryOutcomeReviewsDto,
} from './dto/query-product-goals.dto';

@ApiTags('Product Goals & Outcome Reviews (PROD-002)')
@Controller('product-goals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ProductGoalsController {
  constructor(private readonly productGoalsService: ProductGoalsService) {}

  @Post()
  @RequirePermissions('PRODUCT_GOALS:MANAGE')
  @ApiOperation({ summary: 'Create a new measurable product goal' })
  async createGoal(@Body() dto: CreateProductGoalDto, @Req() req: any) {
    const data = await this.productGoalsService.createGoal(dto, req.user);
    return {
      message: 'Product goal created successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('PRODUCT_GOALS:READ')
  @ApiOperation({ summary: 'List product goals with metrics, progress % and latest review' })
  async getGoals(@Query() query: QueryProductGoalsDto) {
    const data = await this.productGoalsService.getGoals(query);
    return {
      message: 'Product goals retrieved successfully',
      data,
    };
  }

  @Get('summary')
  @RequirePermissions('PRODUCT_GOALS:READ')
  @ApiOperation({ summary: 'Get summary metrics and outcome evaluation distribution' })
  async getGoalsSummary(@Query('product_id') productId?: string) {
    const data = await this.productGoalsService.getGoalsSummary(productId);
    return {
      message: 'Goals summary retrieved successfully',
      data,
    };
  }

  @Get('reviews')
  @RequirePermissions('PRODUCT_GOALS:READ')
  @ApiOperation({ summary: 'List post-release outcome evaluation reviews' })
  async getOutcomeReviews(@Query() query: QueryOutcomeReviewsDto) {
    const data = await this.productGoalsService.getOutcomeReviews(query);
    return {
      message: 'Outcome reviews retrieved successfully',
      data,
    };
  }

  @Get('reviews/:id')
  @RequirePermissions('PRODUCT_GOALS:READ')
  @ApiOperation({ summary: 'Get outcome review details by ID' })
  async getOutcomeReviewById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productGoalsService.getOutcomeReviewById(id);
    return {
      message: 'Outcome review retrieved successfully',
      data,
    };
  }

  @Post('reviews')
  @RequirePermissions('PRODUCT_OUTCOMES:REVIEW')
  @ApiOperation({ summary: 'Conduct and publish post-release outcome evaluation review' })
  async createOutcomeReview(
    @Body() dto: CreateOutcomeReviewDto,
    @Req() req: any,
  ) {
    const data = await this.productGoalsService.createOutcomeReview(dto, req.user);
    return {
      message: 'Post-release outcome evaluation review published successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_GOALS:READ')
  @ApiOperation({ summary: 'Get detailed product goal with linked outcome reviews' })
  async getGoalById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productGoalsService.getGoalById(id);
    return {
      message: 'Product goal retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('PRODUCT_GOALS:MANAGE')
  @ApiOperation({ summary: 'Update product goal definition, targets, or status' })
  async updateGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductGoalDto,
    @Req() req: any,
  ) {
    const data = await this.productGoalsService.updateGoal(id, dto, req.user);
    return {
      message: 'Product goal updated successfully',
      data,
    };
  }

  @Put(':id/progress')
  @RequirePermissions('PRODUCT_GOALS:MANAGE')
  @ApiOperation({ summary: 'Quick update of current metric value and status' })
  async updateGoalProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('current_value') currentValue: number,
    @Body('status') status: any,
    @Req() req: any,
  ) {
    const data = await this.productGoalsService.updateGoalProgress(
      id,
      currentValue,
      status,
      req.user,
    );
    return {
      message: 'Goal progress metric updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_GOALS:MANAGE')
  @ApiOperation({ summary: 'Archive/soft-delete a product goal' })
  async deleteGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const data = await this.productGoalsService.deleteGoal(id, req.user);
    return data;
  }
}
