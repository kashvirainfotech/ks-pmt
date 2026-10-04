import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { DataExchangeService } from './data-exchange.service';
import { DryRunImportDto, ImportEntityType } from './dto/dry-run-import.dto';
import { ExecuteImportDto } from './dto/execute-import.dto';
import { ExportQueryDto } from './dto/export-query.dto';

@Controller('data-exchange')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class DataExchangeController {
  constructor(private readonly dataExchangeService: DataExchangeService) {}

  @Get('templates/:entityType')
  @Permissions('DATA_EXCHANGE:READ')
  getTemplate(@Param('entityType') entityType: ImportEntityType) {
    return this.dataExchangeService.getTemplate(entityType);
  }

  @Post('dry-run')
  @Permissions('DATA_EXCHANGE:IMPORT')
  async dryRunImport(@Body() dto: DryRunImportDto, @Req() req: any) {
    return this.dataExchangeService.dryRunImport(dto, req.user?.id);
  }

  @Post('batches/:batchId/execute')
  @Permissions('DATA_EXCHANGE:IMPORT')
  async executeImport(
    @Param('batchId') batchId: string,
    @Body() dto: ExecuteImportDto,
    @Req() req: any,
  ) {
    return this.dataExchangeService.executeImport(batchId, dto, req.user?.id);
  }

  @Post('batches/:batchId/retry')
  @Permissions('DATA_EXCHANGE:IMPORT')
  async retryBatch(@Param('batchId') batchId: string, @Req() req: any) {
    return this.dataExchangeService.retryBatch(batchId, req.user?.id);
  }

  @Get('batches')
  @Permissions('DATA_EXCHANGE:READ')
  async findAllBatches(@Req() req: any) {
    return this.dataExchangeService.findAllBatches(req.user);
  }

  @Get('batches/:id')
  @Permissions('DATA_EXCHANGE:READ')
  async findBatchById(@Param('id') id: string, @Req() req: any) {
    return this.dataExchangeService.findBatchById(id, req.user);
  }

  @Get('export')
  @Permissions('DATA_EXCHANGE:EXPORT')
  async exportData(@Query() query: ExportQueryDto, @Req() req: any) {
    return this.dataExchangeService.exportData(query, req.user);
  }
}
