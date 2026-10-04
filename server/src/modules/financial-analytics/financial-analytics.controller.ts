import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { CreateFinancialBaselineDto } from './dto/create-financial-baseline.dto';
import { CreateFinancialRateDto } from './dto/create-financial-rate.dto';
import { RecordFinancialMetricDto } from './dto/record-financial-metric.dto';
import { CreateCurrencyExchangeRateDto } from './dto/currency-exchange.dto';

@Controller('financial-analytics')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class FinancialAnalyticsController {
  constructor(private readonly financialService: FinancialAnalyticsService) {}

  // ==========================================
  // Project Financial Overview & Variance
  // ==========================================

  @Get('projects/:projectId/overview')
  @Permissions('FINANCIALS:READ')
  async getProjectFinancialOverview(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const userPermissions: string[] = req.user?.permissions || [];
    return this.financialService.getProjectFinancialOverview(projectId, userPermissions);
  }

  // ==========================================
  // Financial Baselines
  // ==========================================

  @Get('projects/:projectId/baselines')
  @Permissions('FINANCIALS:READ')
  async getBaselines(@Param('projectId') projectId: string) {
    return this.financialService.getBaselines(projectId);
  }

  @Post('baselines')
  @Permissions('FINANCIALS:MANAGE')
  async createBaseline(
    @Body() dto: CreateFinancialBaselineDto,
    @Req() req: any,
  ) {
    return this.financialService.createBaseline(dto, req.user.id);
  }

  @Patch('baselines/:id/toggle-freeze')
  @Permissions('FINANCIALS:MANAGE')
  async toggleFreezeBaseline(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.financialService.toggleFreezeBaseline(id, req.user.id);
  }

  // ==========================================
  // Effective-Dated Rate Cards
  // ==========================================

  @Get('rate-cards')
  @Permissions('FINANCIALS:READ')
  async getRateCards(
    @Query('projectId') projectId: string,
    @Req() req: any,
  ) {
    const userPermissions: string[] = req.user?.permissions || [];
    return this.financialService.getRateCards(projectId, userPermissions);
  }

  @Post('rate-cards')
  @Permissions('FINANCIALS:MANAGE')
  async createRateCard(
    @Body() dto: CreateFinancialRateDto,
    @Req() req: any,
  ) {
    return this.financialService.createRateCard(dto, req.user.id);
  }

  @Delete('rate-cards/:id')
  @Permissions('FINANCIALS:MANAGE')
  async deleteRateCard(@Param('id') id: string) {
    return this.financialService.deleteRateCard(id);
  }

  // ==========================================
  // Periodic Metric Snapshots
  // ==========================================

  @Get('projects/:projectId/metrics')
  @Permissions('FINANCIALS:READ')
  async getPeriodicMetrics(@Param('projectId') projectId: string) {
    return this.financialService.getPeriodicMetrics(projectId);
  }

  @Post('metrics')
  @Permissions('FINANCIALS:MANAGE')
  async recordMetricSnapshot(
    @Body() dto: RecordFinancialMetricDto,
    @Req() req: any,
  ) {
    return this.financialService.recordMetricSnapshot(dto, req.user.id);
  }

  // ==========================================
  // Currency Exchange Rates
  // ==========================================

  @Get('exchange-rates')
  @Permissions('FINANCIALS:READ')
  async getExchangeRates() {
    return this.financialService.getExchangeRates();
  }

  @Post('exchange-rates')
  @Permissions('FINANCIALS:MANAGE')
  async createExchangeRate(
    @Body() dto: CreateCurrencyExchangeRateDto,
    @Req() req: any,
  ) {
    return this.financialService.createExchangeRate(dto, req.user.id);
  }
}
