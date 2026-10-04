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
import { Permissions } from '../rbac/rbac.decorator';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { CommercialService } from './commercial.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { CreateContractPeriodDto } from './dto/create-contract-period.dto';
import { ConsumeWorklogDto } from './dto/consume-worklog.dto';
import { CreateOverageRequestDto } from './dto/create-overage-request.dto';
import { DecideOverageRequestDto } from './dto/decide-overage-request.dto';

@Controller('commercial')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class CommercialController {
  constructor(private readonly commercialService: CommercialService) {}

  // ========================================================
  // Contracts
  // ========================================================

  @Post('contracts')
  @Permissions('COMMERCIAL:MANAGE')
  async createContract(@Body() dto: CreateContractDto, @Req() req: any) {
    return this.commercialService.createContract(dto, req.user?.id);
  }

  @Get('contracts')
  @Permissions('COMMERCIAL:READ')
  async findAllContracts(@Query() query: QueryContractsDto, @Req() req: any) {
    return this.commercialService.findAllContracts(query, req.user);
  }

  @Get('contracts/:id')
  @Permissions('COMMERCIAL:READ')
  async findContractById(@Param('id') id: string, @Req() req: any) {
    return this.commercialService.findContractById(id, req.user);
  }

  @Patch('contracts/:id')
  @Permissions('COMMERCIAL:MANAGE')
  async updateContract(
    @Param('id') id: string,
    @Body() dto: Partial<CreateContractDto>,
    @Req() req: any,
  ) {
    return this.commercialService.updateContract(id, dto, req.user?.id);
  }

  // ========================================================
  // Periods & Rollover
  // ========================================================

  @Post('contracts/:contractId/periods')
  @Permissions('COMMERCIAL:MANAGE')
  async createPeriod(
    @Param('contractId') contractId: string,
    @Body() dto: CreateContractPeriodDto,
    @Req() req: any,
  ) {
    return this.commercialService.createPeriod(contractId, dto, req.user?.id);
  }

  @Get('periods/:id')
  @Permissions('COMMERCIAL:READ')
  async findPeriodById(@Param('id') id: string, @Req() req: any) {
    return this.commercialService.findPeriodById(id, req.user);
  }

  @Post('periods/:id/reconcile')
  @Permissions('COMMERCIAL:CONSUME')
  async reconcilePeriod(@Param('id') id: string, @Req() req: any) {
    return this.commercialService.reconcilePeriod(id, req.user?.id);
  }

  @Post('periods/:id/close-and-rollover')
  @Permissions('COMMERCIAL:MANAGE')
  async closeAndRolloverPeriod(@Param('id') id: string, @Req() req: any) {
    return this.commercialService.closeAndRolloverPeriod(id, req.user?.id);
  }

  // ========================================================
  // Worklog Consumptions
  // ========================================================

  @Post('periods/:id/consume')
  @Permissions('COMMERCIAL:CONSUME')
  async consumeWorklog(
    @Param('id') periodId: string,
    @Body() dto: ConsumeWorklogDto,
    @Req() req: any,
  ) {
    return this.commercialService.consumeWorklog(periodId, dto, req.user?.id);
  }

  @Delete('consumptions/:id')
  @Permissions('COMMERCIAL:CONSUME')
  async removeConsumption(@Param('id') id: string, @Req() req: any) {
    return this.commercialService.removeConsumption(id, req.user?.id);
  }

  // ========================================================
  // Overage Authorizations (CLIENT-004)
  // ========================================================

  @Post('periods/:id/overage-requests')
  @Permissions('COMMERCIAL:OVERAGE')
  async createOverageRequest(
    @Param('id') periodId: string,
    @Body() dto: CreateOverageRequestDto,
    @Req() req: any,
  ) {
    return this.commercialService.createOverageRequest(periodId, dto, req.user?.id);
  }

  @Patch('overage-requests/:id/decision')
  @Permissions('COMMERCIAL:OVERAGE')
  async decideOverageRequest(
    @Param('id') requestId: string,
    @Body() dto: DecideOverageRequestDto,
    @Req() req: any,
  ) {
    return this.commercialService.decideOverageRequest(requestId, dto, req.user?.id);
  }

  // ========================================================
  // Client Statement (Zero Margin Leakage)
  // ========================================================

  @Get('statements')
  @Permissions('COMMERCIAL:READ')
  async getClientStatement(
    @Query('contractId') contractId: string,
    @Query('periodId') periodId?: string,
    @Req() req?: any,
  ) {
    return this.commercialService.getClientStatement(contractId, periodId, req?.user);
  }
}
