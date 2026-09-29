import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { ParseUUIDPipe } from '../../common/validators/record-id';
import { CreateUatPackageDto } from './dto/create-uat-package.dto';
import { CreateUatRevisionDto } from './dto/create-uat-revision.dto';
import { ReviewUatRevisionDto } from './dto/review-uat-revision.dto';
import { RecordChecklistProgressDto } from './dto/record-checklist-progress.dto';
import { ClientUatDecisionDto } from './dto/client-uat-decision.dto';
import { RecordInstalledVersionDto } from './dto/record-installed-version.dto';
import { QueryUatPackagesDto } from './dto/query-uat-packages.dto';
import { UatPackagesService } from './uat-packages.service';

@Controller('uat-packages')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class UatPackagesController {
  constructor(private readonly uatPackagesService: UatPackagesService) {}

  @Post()
  @Permissions('UAT_PACKAGES:MANAGE')
  async createUatPackage(@Body() dto: CreateUatPackageDto, @Req() req: any) {
    return await this.uatPackagesService.createUatPackage(dto, req.user.id);
  }

  @Get()
  @Permissions('UAT_PACKAGES:READ')
  async getUatPackages(@Query() query: QueryUatPackagesDto) {
    return await this.uatPackagesService.getUatPackages(query);
  }

  @Get('installed-versions/client/:clientId')
  @Permissions('UAT_PACKAGES:READ')
  async getInstalledVersions(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return await this.uatPackagesService.getInstalledVersions(clientId);
  }

  @Post('installed-versions')
  @Permissions('UAT_PACKAGES:MANAGE')
  async recordInstalledVersion(
    @Body() dto: RecordInstalledVersionDto,
    @Req() req: any,
  ) {
    return await this.uatPackagesService.recordInstalledVersion(dto, req.user.id);
  }

  @Get(':id')
  @Permissions('UAT_PACKAGES:READ')
  async getUatPackageById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.uatPackagesService.getUatPackageById(id);
  }

  @Post(':id/submit-qa')
  @Permissions('UAT_PACKAGES:MANAGE')
  async submitForQaReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return await this.uatPackagesService.submitForQaReview(id, req.user.id);
  }

  @Post(':id/revisions/:rev/review-qa')
  @Permissions('UAT_PACKAGES:APPROVE')
  async reviewRevisionQa(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rev', ParseIntPipe) rev: number,
    @Body() dto: ReviewUatRevisionDto,
    @Req() req: any,
  ) {
    return await this.uatPackagesService.reviewRevisionQa(id, rev, dto, req.user.id);
  }

  @Post(':id/revisions')
  @Permissions('UAT_PACKAGES:MANAGE')
  async createMaterialRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateUatRevisionDto,
    @Req() req: any,
  ) {
    return await this.uatPackagesService.createMaterialRevision(id, dto, req.user.id);
  }

  @Patch('checklist-items/:itemId')
  @Permissions('UAT_PACKAGES:MANAGE')
  async updateChecklistItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RecordChecklistProgressDto,
    @Req() req: any,
  ) {
    return await this.uatPackagesService.updateChecklistItem(
      itemId,
      dto,
      req.user.id,
      undefined,
    );
  }

  @Post(':id/revisions/:rev/decision')
  @Permissions('UAT_PACKAGES:APPROVE')
  async recordClientDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rev', ParseIntPipe) rev: number,
    @Body() dto: ClientUatDecisionDto,
    @Req() req: any,
  ) {
    return await this.uatPackagesService.recordClientDecision(
      id,
      rev,
      dto,
      undefined,
      req.user.id,
    );
  }
}
