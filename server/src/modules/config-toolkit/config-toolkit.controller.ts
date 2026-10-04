import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { DynamicRbacGuard } from "../rbac/rbac.guard";
import { Permissions } from "../rbac/rbac.decorator";
import { ConfigToolkitService } from "./config-toolkit.service";
import { UpdateCompanySettingsDto } from "./dto/update-company-settings.dto";
import {
  ApplyPackageDto,
  DryRunPackageDto,
  ExportConfigurationDto,
} from "./dto/package-dtos";

@Controller("config-toolkit")
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class ConfigToolkitController {
  constructor(private readonly configToolkitService: ConfigToolkitService) {}

  // ==========================================
  // COMPANY SETTINGS & SETUP WIZARD
  // ==========================================

  @Get("settings")
  @Permissions("ADMIN:SETUP_WIZARD")
  getCompanySettings() {
    return this.configToolkitService.getCompanySettings();
  }

  @Put("settings")
  @Permissions("ADMIN:SETUP_WIZARD")
  updateCompanySettings(
    @Body() dto: UpdateCompanySettingsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.configToolkitService.updateCompanySettings(dto, userId);
  }

  @Post("settings/reset-wizard")
  @Permissions("ADMIN:SETUP_WIZARD")
  resetSetupWizard(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.configToolkitService.resetSetupWizard(userId);
  }

  // ==========================================
  // CONFIGURATION PACKAGES
  // ==========================================

  @Get("packages")
  @Permissions("ADMIN:CONFIG_PACKAGES")
  getPackages() {
    return this.configToolkitService.getPackages();
  }

  @Get("packages/:id")
  @Permissions("ADMIN:CONFIG_PACKAGES")
  getPackageById(@Param("id") id: string) {
    return this.configToolkitService.getPackageById(id);
  }

  @Post("packages/export")
  @Permissions("ADMIN:CONFIG_PACKAGES")
  exportCurrentConfiguration(
    @Body() dto: ExportConfigurationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.configToolkitService.exportCurrentConfiguration(dto, userId);
  }

  @Post("packages/dry-run")
  @Permissions("ADMIN:CONFIG_PACKAGES")
  previewPackageDiff(@Body() dto: DryRunPackageDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.configToolkitService.previewPackageDiff(dto, userId);
  }

  @Post("packages/apply")
  @Permissions("ADMIN:CONFIG_PACKAGES")
  applyPackage(@Body() dto: ApplyPackageDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.configToolkitService.applyPackage(dto, userId);
  }

  @Get("audit-logs")
  @Permissions("ADMIN:CONFIG_PACKAGES")
  getAuditLogs() {
    return this.configToolkitService.getAuditLogs();
  }
}
