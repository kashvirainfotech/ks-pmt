import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { DynamicRbacGuard } from '../../guards/dynamic-rbac.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { ClientReportsService } from './client-reports.service';
import { CreateClientReportDto } from './dto/create-client-report.dto';
import { UpdateClientReportDto } from './dto/update-client-report.dto';
import { PublishClientReportDto } from './dto/publish-client-report.dto';
import { QueryClientReportsDto } from './dto/query-client-reports.dto';

@Controller('client-reports')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class ClientReportsController {
  constructor(private readonly clientReportsService: ClientReportsService) {}

  @Post()
  @Permissions('CLIENT_REPORTS:MANAGE')
  async create(@Body() dto: CreateClientReportDto, @Request() req: any) {
    return this.clientReportsService.create(dto, req.user.id);
  }

  @Get()
  @Permissions('CLIENT_REPORTS:READ')
  async findAll(@Query() query: QueryClientReportsDto) {
    return this.clientReportsService.findAll(query);
  }

  @Get(':id')
  @Permissions('CLIENT_REPORTS:READ')
  async findById(@Param('id') id: string) {
    return this.clientReportsService.findById(id, true);
  }

  @Get(':id/digest')
  @Permissions('CLIENT_REPORTS:READ')
  async getDigest(@Param('id') id: string) {
    const digest = await this.clientReportsService.generateDigest(id);
    return { digest };
  }

  @Patch(':id')
  @Permissions('CLIENT_REPORTS:MANAGE')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientReportDto,
    @Request() req: any,
  ) {
    return this.clientReportsService.update(id, dto, req.user.id);
  }

  @Post(':id/submit-review')
  @Permissions('CLIENT_REPORTS:MANAGE')
  async submitForReview(@Param('id') id: string, @Request() req: any) {
    return this.clientReportsService.submitForReview(id, req.user.id);
  }

  @Post(':id/publish')
  @Permissions('CLIENT_REPORTS:PUBLISH')
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishClientReportDto,
    @Request() req: any,
  ) {
    return this.clientReportsService.publish(id, dto, req.user.id);
  }

  @Post(':id/archive')
  @Permissions('CLIENT_REPORTS:MANAGE')
  async archive(@Param('id') id: string, @Request() req: any) {
    return this.clientReportsService.archive(id, req.user.id);
  }
}
