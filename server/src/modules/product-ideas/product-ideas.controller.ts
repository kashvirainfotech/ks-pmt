import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { ProductIdeasService } from './product-ideas.service';
import { CreateProductIdeaDto } from './dto/create-product-idea.dto';
import { UpdateProductIdeaDto } from './dto/update-product-idea.dto';
import { ScoreProductIdeaDto } from './dto/score-product-idea.dto';
import { ModerateProductIdeaDto } from './dto/moderate-product-idea.dto';
import { MergeProductIdeaDto } from './dto/merge-product-idea.dto';
import { UpdateRoadmapDto } from './dto/update-roadmap.dto';
import { QueryProductIdeasDto } from './dto/query-product-ideas.dto';

@ApiTags('Product Discovery, Voting & Roadmaps (PROD-001)')
@Controller('product-ideas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ProductIdeasController {
  constructor(private readonly productIdeasService: ProductIdeasService) {}

  @Post()
  @RequirePermissions('PRODUCT_IDEAS:MANAGE')
  @ApiOperation({ summary: 'Create a new product discovery idea with RICE scoring' })
  async createIdea(@Body() dto: CreateProductIdeaDto, @Req() req: any) {
    const data = await this.productIdeasService.createIdea(dto, req.user);
    return {
      message: 'Product idea created successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('PRODUCT_IDEAS:READ')
  @ApiOperation({ summary: 'List product ideas with filtering, RICE sorting and voting count' })
  async getIdeas(@Query() query: QueryProductIdeasDto) {
    const data = await this.productIdeasService.getIdeas(query);
    return {
      message: 'Product ideas retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_IDEAS:READ')
  @ApiOperation({ summary: 'Get detailed product idea with scoring and merge history' })
  async getIdeaById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productIdeasService.getIdeaById(id);
    return {
      message: 'Product idea retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('PRODUCT_IDEAS:MANAGE')
  @ApiOperation({ summary: 'Update product idea attributes and recalculate scores' })
  async updateIdea(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductIdeaDto,
    @Req() req: any,
  ) {
    const data = await this.productIdeasService.updateIdea(id, dto, req.user);
    return {
      message: 'Product idea updated successfully',
      data,
    };
  }

  @Post(':id/score')
  @RequirePermissions('PRODUCT_IDEAS:MANAGE')
  @ApiOperation({ summary: 'Update RICE prioritization score' })
  async scoreIdea(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScoreProductIdeaDto,
    @Req() req: any,
  ) {
    const data = await this.productIdeasService.scoreIdea(id, dto, req.user);
    return {
      message: 'RICE score updated successfully',
      data,
    };
  }

  @Post(':id/moderate')
  @RequirePermissions('PRODUCT_IDEAS:MANAGE')
  @ApiOperation({ summary: 'Moderate, sanitize and publish idea for authenticated customer community' })
  async moderateIdea(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateProductIdeaDto,
    @Req() req: any,
  ) {
    const data = await this.productIdeasService.moderateIdea(id, dto, req.user);
    return {
      message: 'Product idea moderation updated',
      data,
    };
  }

  @Post(':id/roadmap')
  @RequirePermissions('PRODUCT_IDEAS:ROADMAP')
  @ApiOperation({ summary: 'Assign idea to Now/Next/Later roadmap and target release' })
  async updateRoadmap(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoadmapDto,
    @Req() req: any,
  ) {
    const data = await this.productIdeasService.updateRoadmap(id, dto, req.user);
    return {
      message: 'Roadmap assignment updated successfully',
      data,
    };
  }

  @Post(':id/merge')
  @RequirePermissions('PRODUCT_IDEAS:MANAGE')
  @ApiOperation({ summary: 'Merge duplicate idea into canonical idea with atomic vote deduplication' })
  async mergeDuplicateIdea(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeProductIdeaDto,
    @Req() req: any,
  ) {
    const data = await this.productIdeasService.mergeDuplicateIdea(id, dto, req.user);
    return data;
  }
}
