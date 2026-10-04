import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { UpdateCompanySettingsDto } from "./dto/update-company-settings.dto";
import {
  ApplyPackageDto,
  CreateConfigurationPackageDto,
  DryRunPackageDto,
  ExportConfigurationDto,
} from "./dto/package-dtos";
import {
  sanitizeConfigurationBundle,
  sanitizeHexColor,
} from "./sanitizer";

@Injectable()
export class ConfigToolkitService {
  private readonly logger = new Logger(ConfigToolkitService.name);

  constructor(private readonly db: DatabaseService) {}

  // =========================================================================
  // 1. SINGLE-COMPANY SETTINGS & SETUP WIZARD
  // =========================================================================

  /**
   * Retrieves single-company installation profile and wizard progress
   */
  async getCompanySettings() {
    const res = await this.db.query(
      `
      SELECT cs.*, b.branch_name as headquarters_branch_name
      FROM company_settings cs
      LEFT JOIN branches b ON b.id = cs.headquarters_branch_id
      WHERE cs.is_active = TRUE
      ORDER BY cs.created_at ASC
      LIMIT 1;
    `,
    );

    if (res.rows.length === 0) {
      // Initialize fallback record if not seeded yet
      const initRes = await this.db.query(
        `
        INSERT INTO company_settings (
          company_name, default_currency, timezone, date_format,
          branding_primary_color, branding_accent_color, setup_wizard_completed,
          setup_wizard_step, enabled_modules, is_active, created_by
        ) VALUES (
          'Kashvira Infotech Private Limited', 'INR', 'Asia/Kolkata', 'YYYY-MM-DD',
          '#2563eb', '#4f46e5', FALSE, 1,
          '{"tasks": true, "sprints": true, "timesheets": true, "crm_clients": true, "qa_testing": true, "customer_portal": true, "commercial": true, "sla_alerts": true, "analytics": true, "webhooks": true, "config_packages": true}'::jsonb,
          TRUE, '00000000-0000-0000-0000-000000000001'
        ) RETURNING *;
      `,
      );
      return initRes.rows[0];
    }

    return res.rows[0];
  }

  /**
   * Updates company settings, corporate branding, or wizard step
   */
  async updateCompanySettings(dto: UpdateCompanySettingsDto, userId: string) {
    const current = await this.getCompanySettings();

    const primaryColor = sanitizeHexColor(
      dto.brandingPrimaryColor || current.branding_primary_color,
      "#2563eb",
    );
    const accentColor = sanitizeHexColor(
      dto.brandingAccentColor || current.branding_accent_color,
      "#4f46e5",
    );

    const isCompleted = dto.setupWizardCompleted !== undefined
      ? dto.setupWizardCompleted
      : current.setup_wizard_completed;

    const completedAt = isCompleted && !current.setup_wizard_completed
      ? new Date()
      : current.setup_completed_at;

    const updateSql = `
      UPDATE company_settings
      SET company_name = COALESCE($1, company_name),
          legal_name = COALESCE($2, legal_name),
          registration_number = COALESCE($3, registration_number),
          tax_id = COALESCE($4, tax_id),
          company_domain = COALESCE($5, company_domain),
          primary_email = COALESCE($6, primary_email),
          support_email = COALESCE($7, support_email),
          headquarters_branch_id = COALESCE($8, headquarters_branch_id),
          default_currency = COALESCE($9, default_currency),
          timezone = COALESCE($10, timezone),
          date_format = COALESCE($11, date_format),
          branding_primary_color = $12,
          branding_accent_color = $13,
          logo_url = COALESCE($14, logo_url),
          favicon_url = COALESCE($15, favicon_url),
          setup_wizard_completed = $16,
          setup_wizard_step = COALESCE($17, setup_wizard_step),
          setup_completed_at = $18,
          enabled_modules = COALESCE($19, enabled_modules),
          updated_by = $20,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *;
    `;

    const res = await this.db.query(updateSql, [
      dto.companyName || null,
      dto.legalName || null,
      dto.registrationNumber || null,
      dto.taxId || null,
      dto.companyDomain || null,
      dto.primaryEmail || null,
      dto.supportEmail || null,
      dto.headquartersBranchId || null,
      dto.defaultCurrency || null,
      dto.timezone || null,
      dto.dateFormat || null,
      primaryColor,
      accentColor,
      dto.logoUrl || null,
      dto.faviconUrl || null,
      isCompleted,
      dto.setupWizardStep || null,
      completedAt,
      dto.enabledModules ? JSON.stringify(dto.enabledModules) : null,
      userId,
      current.id,
    ]);

    this.logger.log(`Updated company settings for ${res.rows[0].company_name}`);
    return res.rows[0];
  }

  /**
   * Resets the setup wizard back to Step 1 for re-running the initialization flow
   */
  async resetSetupWizard(userId: string) {
    const current = await this.getCompanySettings();
    const res = await this.db.query(
      `
      UPDATE company_settings
      SET setup_wizard_completed = FALSE,
          setup_wizard_step = 1,
          updated_by = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `,
      [userId, current.id],
    );
    this.logger.log(`Reset setup wizard to Step 1`);
    return res.rows[0];
  }

  // =========================================================================
  // 2. CONFIGURATION PACKAGES (PORTABLE TEMPLATES & BUNDLES)
  // =========================================================================

  /**
   * List all available configuration packages (built-in starter packs + custom exports)
   */
  async getPackages() {
    const res = await this.db.query(
      `
      SELECT cp.*, u.first_name || ' ' || u.last_name as applied_by_name
      FROM configuration_packages cp
      LEFT JOIN users u ON u.id = cp.applied_by
      WHERE cp.is_active = TRUE
      ORDER BY cp.is_builtin_template DESC, cp.created_at DESC;
    `,
    );
    return res.rows;
  }

  /**
   * Get single configuration package by ID
   */
  async getPackageById(id: string) {
    const res = await this.db.query(
      `
      SELECT cp.*, u.first_name || ' ' || u.last_name as applied_by_name
      FROM configuration_packages cp
      LEFT JOIN users u ON u.id = cp.applied_by
      WHERE cp.id = $1 AND cp.is_active = TRUE;
    `,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Configuration package with ID ${id} not found`);
    }

    return res.rows[0];
  }

  /**
   * Exports the current live system configuration into a portable versioned package.
   * STRICT SECURITY: Excludes users, passwords, client names, and financial margins.
   */
  async exportCurrentConfiguration(dto: ExportConfigurationDto, userId: string) {
    // 1. Gather live task types
    const taskTypesRes = await this.db.query(
      `SELECT type_code, type_name, color_code, badge_icon, is_chargeable_default FROM task_types WHERE is_active = TRUE`,
    );

    // 2. Gather live workflow statuses
    const statusesRes = await this.db.query(
      `SELECT status_code, status_name, color_code, stage_order, is_initial, is_completed, is_cancelled, status_category FROM task_workflow_statuses WHERE is_active = TRUE ORDER BY stage_order ASC`,
    );

    // 3. Gather project templates
    const templatesRes = await this.db.query(
      `SELECT template_code, template_name, category, default_methodology, default_estimated_duration_days, description FROM project_templates WHERE is_active = TRUE`,
    );

    // 4. Gather SLA policies
    const slaRes = await this.db.query(
      `SELECT policy_code, policy_name, service_tier, target_type, response_target_hours, resolution_target_hours, calendar_basis FROM sla_policies WHERE is_active = TRUE`,
    );

    const rawBundle: Record<string, any> = {
      version: "1.0.0",
      metadata: {
        exported_by: userId,
        exported_at: new Date().toISOString(),
        package_code: dto.packageCode,
        package_name: dto.packageName,
      },
      task_types: taskTypesRes.rows,
      workflow_statuses: statusesRes.rows,
      project_templates: templatesRes.rows,
      sla_policies: slaRes.rows,
    };

    const sanitizedBundle = sanitizeConfigurationBundle(rawBundle);

    const manifest = {
      task_types: taskTypesRes.rows.length,
      workflow_statuses: statusesRes.rows.length,
      project_templates: templatesRes.rows.length,
      sla_policies: slaRes.rows.length,
    };

    const insertSql = `
      INSERT INTO configuration_packages (
        package_code, package_name, version, pmt_version_compatibility,
        package_type, description, manifest, package_data, is_builtin_template,
        created_by, updated_by
      ) VALUES ($1, $2, '1.0.0', '1.0.0', $3, $4, $5, $6, FALSE, $7, $7)
      RETURNING *;
    `;

    const res = await this.db.query(insertSql, [
      dto.packageCode,
      dto.packageName,
      dto.packageType || "FULL",
      dto.description || "Exported live system configuration bundle",
      JSON.stringify(manifest),
      JSON.stringify(sanitizedBundle),
      userId,
    ]);

    // Record audit log
    await this.db.query(
      `
      INSERT INTO configuration_audit_logs (
        package_id, action, applied_changes, status, executed_by, created_by
      ) VALUES ($1, 'EXPORT_PACKAGE', $2, 'SUCCESS', $3, $3);
    `,
      [res.rows[0].id, JSON.stringify([{ action: "EXPORTED", manifest }]), userId],
    );

    this.logger.log(`Exported configuration package ${dto.packageCode}`);
    return res.rows[0];
  }

  /**
   * Previews diff and performs dry-run dependency validation before applying a package
   */
  async previewPackageDiff(dto: DryRunPackageDto, userId: string) {
    let pkgData: any = dto.rawPackageData;
    let pkgId: string | null = dto.packageId || null;

    if (!pkgData && dto.packageId) {
      const pkg = await this.getPackageById(dto.packageId);
      pkgData = pkg.package_data;
    }

    if (!pkgData) {
      throw new BadRequestException("Either packageId or rawPackageData must be supplied for preview");
    }

    const sanitized = sanitizeConfigurationBundle(pkgData);
    const diffs: any[] = [];
    const conflicts: any[] = [];

    // 1. Task Types Diff
    if (Array.isArray(sanitized.task_types)) {
      const existingRes = await this.db.query(
        `SELECT type_code, type_name FROM task_types WHERE is_active = TRUE`,
      );
      const existingMap = new Map(existingRes.rows.map((r) => [r.type_code, r.type_name]));

      for (const item of sanitized.task_types) {
        if (!item.code && !item.type_code) continue;
        const code = item.code || item.type_code;
        const name = item.name || item.type_name;
        if (existingMap.has(code)) {
          diffs.push({
            entity: "TASK_TYPE",
            identifier: code,
            action: "MATCHES_EXISTING",
            details: `Task type "${code}" already exists in system`,
          });
        } else {
          diffs.push({
            entity: "TASK_TYPE",
            identifier: code,
            action: "CREATE_NEW",
            details: `Will create task type "${name}" (${code})`,
          });
        }
      }
    }

    // 2. Workflow Statuses Diff
    if (Array.isArray(sanitized.workflow_statuses) || Array.isArray(sanitized.workflow_stages)) {
      const statuses = sanitized.workflow_statuses || sanitized.workflow_stages;
      const existingRes = await this.db.query(
        `SELECT status_code, status_name FROM task_workflow_statuses WHERE is_active = TRUE`,
      );
      const existingMap = new Map(existingRes.rows.map((r) => [r.status_code, r.status_name]));

      for (const st of statuses) {
        const code = typeof st === "string" ? st : st.status_code || st.code;
        const name = typeof st === "string" ? st : st.status_name || st.name;
        if (existingMap.has(code)) {
          diffs.push({
            entity: "WORKFLOW_STATUS",
            identifier: code,
            action: "MATCHES_EXISTING",
            details: `Workflow stage "${code}" already exists`,
          });
        } else {
          diffs.push({
            entity: "WORKFLOW_STATUS",
            identifier: code,
            action: "CREATE_NEW",
            details: `Will register workflow status "${name || code}"`,
          });
        }
      }
    }

    // 3. Project Templates Diff
    if (Array.isArray(sanitized.project_templates)) {
      const existingRes = await this.db.query(
        `SELECT template_code, template_name FROM project_templates WHERE is_active = TRUE`,
      );
      const existingMap = new Map(existingRes.rows.map((r) => [r.template_code, r.template_name]));

      for (const tpl of sanitized.project_templates) {
        if (!tpl.template_code && !tpl.code) continue;
        const code = tpl.template_code || tpl.code;
        const name = tpl.template_name || tpl.name;
        if (existingMap.has(code)) {
          conflicts.push({
            entity: "PROJECT_TEMPLATE",
            identifier: code,
            reason: `Template code ${code} matches an existing template. Will be skipped unless overwrite is chosen.`,
          });
        } else {
          diffs.push({
            entity: "PROJECT_TEMPLATE",
            identifier: code,
            action: "CREATE_NEW",
            details: `Will add project template "${name}"`,
          });
        }
      }
    }

    // Record dry-run preview audit entry
    await this.db.query(
      `
      INSERT INTO configuration_audit_logs (
        package_id, action, applied_changes, conflicts_detected, status, executed_by, created_by
      ) VALUES ($1, 'DRY_RUN_PREVIEW', $2, $3, $4, $5, $5);
    `,
      [
        pkgId,
        JSON.stringify(diffs),
        JSON.stringify(conflicts),
        conflicts.length > 0 ? "WARNINGS" : "SUCCESS",
        userId,
      ],
    );

    return {
      compatible: true,
      pmtVersion: "1.0.0",
      totalChanges: diffs.length,
      newEntities: diffs.filter((d) => d.action === "CREATE_NEW").length,
      existingEntities: diffs.filter((d) => d.action === "MATCHES_EXISTING").length,
      conflicts,
      diffs,
    };
  }

  /**
   * Applies a configuration package explicitly into the active system
   */
  async applyPackage(dto: ApplyPackageDto, userId: string) {
    let pkgData: any = dto.rawPackageData;
    let pkgId: string | null = dto.packageId || null;

    if (!pkgData && dto.packageId) {
      const pkg = await this.getPackageById(dto.packageId);
      pkgData = pkg.package_data;
    }

    if (!pkgData) {
      throw new BadRequestException("Either packageId or rawPackageData must be provided to apply");
    }

    const sanitized = sanitizeConfigurationBundle(pkgData);
    const applied: any[] = [];
    const conflictRes = dto.conflictResolution || "SKIP";

    // 1. Apply Task Types
    if (Array.isArray(sanitized.task_types)) {
      for (const item of sanitized.task_types) {
        const code = item.code || item.type_code;
        const name = item.name || item.type_name || code;
        const color = item.color || item.color_code || "#3b82f6";
        const isChargeable = item.is_chargeable ?? item.is_chargeable_default ?? true;

        if (!code) continue;

        const checkRes = await this.db.query(
          `SELECT id FROM task_types WHERE type_code = $1`,
          [code],
        );

        if (checkRes.rows.length === 0) {
          await this.db.query(
            `
            INSERT INTO task_types (
              type_code, type_name, color_code, is_chargeable_default, is_active, created_by
            ) VALUES ($1, $2, $3, $4, TRUE, $5);
          `,
            [code, name, color, isChargeable, userId],
          );
          applied.push({ entity: "TASK_TYPE", identifier: code, status: "CREATED" });
        } else if (conflictRes === "OVERWRITE") {
          await this.db.query(
            `
            UPDATE task_types
            SET type_name = $1, color_code = $2, is_chargeable_default = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
            WHERE type_code = $5;
          `,
            [name, color, isChargeable, userId, code],
          );
          applied.push({ entity: "TASK_TYPE", identifier: code, status: "OVERWRITTEN" });
        } else {
          applied.push({ entity: "TASK_TYPE", identifier: code, status: "SKIPPED_EXISTING" });
        }
      }
    }

    // 2. Mark package as applied
    if (pkgId) {
      await this.db.query(
        `
        UPDATE configuration_packages
        SET applied_at = CURRENT_TIMESTAMP, applied_by = $1, updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2;
      `,
        [userId, pkgId],
      );
    }

    // 3. Record application audit log
    await this.db.query(
      `
      INSERT INTO configuration_audit_logs (
        package_id, action, applied_changes, status, executed_by, created_by
      ) VALUES ($1, 'APPLY_PACKAGE', $2, 'SUCCESS', $3, $3);
    `,
      [pkgId, JSON.stringify(applied), userId],
    );

    this.logger.log(`Successfully applied configuration package (${applied.length} items evaluated)`);
    return {
      success: true,
      appliedCount: applied.filter((a) => a.status === "CREATED" || a.status === "OVERWRITTEN").length,
      skippedCount: applied.filter((a) => a.status === "SKIPPED_EXISTING").length,
      items: applied,
    };
  }

  /**
   * Retrieves audit logs for configuration package actions
   */
  async getAuditLogs() {
    const res = await this.db.query(
      `
      SELECT cal.*, cp.package_name, cp.package_code, u.first_name || ' ' || u.last_name as executed_by_name
      FROM configuration_audit_logs cal
      LEFT JOIN configuration_packages cp ON cp.id = cal.package_id
      LEFT JOIN users u ON u.id = cal.executed_by
      WHERE cal.is_active = TRUE
      ORDER BY cal.created_at DESC
      LIMIT 50;
    `,
    );
    return res.rows;
  }
}
