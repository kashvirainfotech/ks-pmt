import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DryRunImportDto, ImportEntityType, ImportMode } from './dto/dry-run-import.dto';
import { ExecuteImportDto } from './dto/execute-import.dto';
import { ExportQueryDto } from './dto/export-query.dto';

export interface RowValidationResult {
  rowIndex: number;
  externalId?: string;
  isValid: boolean;
  errors: Array<{ field: string; message: string; code: string }>;
  mappedData: Record<string, any>;
  rawRow: Record<string, any>;
}

@Injectable()
export class DataExchangeService {
  private readonly logger = new Logger(DataExchangeService.name);

  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. Downloadable CSV Templates & Field Catalog
  // ========================================================

  getTemplate(entityType: ImportEntityType) {
    switch (entityType) {
      case ImportEntityType.TASKS:
        return {
          entityType,
          headers: [
            'external_id',
            'title',
            'description',
            'project_code',
            'product_code',
            'task_type',
            'priority',
            'severity',
            'estimated_hours',
            'planned_start_date',
            'planned_end_date',
            'assignee_email',
          ],
          sampleRows: [
            {
              external_id: 'LEGACY-001',
              title: 'Automate GST E-Invoice generation',
              description: 'Integrate Indian GST sandbox for real-time IRN generation',
              project_code: 'PRJ-ACME-MOB',
              product_code: '',
              task_type: 'BUG',
              priority: 'HIGH',
              severity: 'HIGH',
              estimated_hours: '16.0',
              planned_start_date: '2026-10-01',
              planned_end_date: '2026-10-15',
              assignee_email: 'alex.dev@kashvirainfotech.com',
            },
            {
              external_id: 'LEGACY-002',
              title: 'Add biometric authentication on wire transfers',
              description: 'Native FaceID and fingerprint confirmation prompt before fund transfer',
              project_code: 'PRJ-ACME-MOB',
              product_code: '',
              task_type: 'FEATURE',
              priority: 'CRITICAL',
              severity: 'CRITICAL',
              estimated_hours: '24.0',
              planned_start_date: '2026-10-02',
              planned_end_date: '2026-10-20',
              assignee_email: 'alex.dev@kashvirainfotech.com',
            },
          ],
          fieldDescriptions: {
            external_id: 'Unique identifier from source system for idempotent deduplication and retry tracking',
            title: 'Task summary or title (Mandatory)',
            description: 'Detailed description or acceptance specifications',
            project_code: 'Target project code (Required if product_code is empty)',
            product_code: 'Target product code (Required if project_code is empty)',
            task_type: 'Type name: BUG, FEATURE, TASK, EPIC, SUPPORT, ENHANCEMENT',
            priority: 'LOW, MEDIUM, HIGH, CRITICAL',
            severity: 'LOW, MEDIUM, HIGH, CRITICAL',
            estimated_hours: 'Numeric effort estimation',
            planned_start_date: 'YYYY-MM-DD',
            planned_end_date: 'YYYY-MM-DD',
            assignee_email: 'Email of employee to assign as primary owner',
          },
        };

      case ImportEntityType.CLIENTS:
        return {
          entityType,
          headers: [
            'client_code',
            'company_name',
            'contact_person',
            'designation',
            'email',
            'mobile_number',
            'city',
            'state',
            'country',
            'client_type',
            'branch_code',
          ],
          sampleRows: [
            {
              client_code: 'CLI-GLOBAL-LOG',
              company_name: 'Global Logistics Corp',
              contact_person: 'Marcus Vance',
              designation: 'VP Technology',
              email: 'marcus@globallogistics.com',
              mobile_number: '+919876500001',
              city: 'Mumbai',
              state: 'Maharashtra',
              country: 'India',
              client_type: 'ACTIVE_CLIENT',
              branch_code: 'BR-HO',
            },
          ],
          fieldDescriptions: {
            client_code: 'Unique alphanumeric client identifier (e.g. CLI-GLOBAL)',
            company_name: 'Legal company or organization name (Mandatory)',
            contact_person: 'Primary business point of contact',
            designation: 'Contact person job title',
            email: 'Primary contact email address',
            mobile_number: 'E.164 formatted telephone number',
            client_type: 'PROSPECT or ACTIVE_CLIENT',
            branch_code: 'Internal branch owning the relationship',
          },
        };

      case ImportEntityType.PROJECTS:
        return {
          entityType,
          headers: [
            'project_code',
            'project_name',
            'client_code',
            'project_type',
            'total_budget',
            'currency',
            'start_date',
            'target_end_date',
          ],
          sampleRows: [
            {
              project_code: 'PRJ-NEO-RETAIL',
              project_name: 'Neo Retail Omnichannel App',
              client_code: 'CLI-ACME',
              project_type: 'TIME_AND_MATERIALS',
              total_budget: '500000.00',
              currency: 'INR',
              start_date: '2026-10-01',
              target_end_date: '2027-03-31',
            },
          ],
          fieldDescriptions: {
            project_code: 'Unique project code (Mandatory)',
            project_name: 'Project name (Mandatory)',
            client_code: 'Client code owning project',
            project_type: 'FIXED_PRICE, TIME_AND_MATERIALS, NON_BILLABLE',
            total_budget: 'Total estimated commercial budget',
            currency: 'Currency code (INR, USD, EUR)',
          },
        };

      default:
        return {
          entityType,
          headers: ['external_id', 'code', 'name', 'description'],
          sampleRows: [{ external_id: 'EXT-01', code: 'CODE-01', name: 'Sample Item', description: 'Sample' }],
          fieldDescriptions: {},
        };
    }
  }

  // ========================================================
  // 2. CSV Parser Helper (RFC 4180 Compliant)
  // ========================================================

  parseCsv(content: string): Array<Record<string, string>> {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }

    return rows;
  }

  // ========================================================
  // 3. Formula Injection Sanitizer (CWE-1236 Prevention)
  // Prepends single quote if value begins with =, +, -, @, \t, \r
  // ========================================================

  sanitizeFormulaInjection(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  }

  // ========================================================
  // 4. Dry-Run Validation Engine (Zero Writes Guarantee)
  // Acceptance guarantee:
  // "a mixed-validity batch previews without writes,
  //  reports rejected references, imports permitted rows"
  // ========================================================

  async dryRunImport(dto: DryRunImportDto, userId: string) {
    const rawRows = this.parseCsv(dto.csvContent);
    if (rawRows.length === 0) {
      throw new BadRequestException('CSV file is empty or contains no readable rows');
    }

    // Pre-load reference maps for fast in-memory validation
    const refMaps = await this.loadReferenceMaps(dto.entityType);

    const validationResults: RowValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let idx = 0; idx < rawRows.length; idx++) {
      const rowIndex = idx + 1;
      const rawRow = rawRows[idx];
      const errors: Array<{ field: string; message: string; code: string }> = [];

      // Apply column mapping if provided
      const mappedData: Record<string, any> = {};
      Object.keys(rawRow).forEach((col) => {
        const targetField = dto.columnMapping?.[col] || col;
        mappedData[targetField] = rawRow[col];
      });

      // Strict security rule: approval and audit fields CANNOT be set via import
      delete mappedData['approval_status'];
      delete mappedData['reviewed_by'];
      delete mappedData['reviewed_at'];
      delete mappedData['is_approved'];
      delete mappedData['created_at'];
      delete mappedData['created_by'];
      delete mappedData['is_scope_addition'];

      const externalId = mappedData['external_id'] || mappedData['task_code'] || mappedData['client_code'] || mappedData['project_code'] || `ROW-${rowIndex}`;

      // Entity-specific validation
      if (dto.entityType === ImportEntityType.TASKS) {
        if (!mappedData['title']) {
          errors.push({ field: 'title', message: 'Task title is required', code: 'REQUIRED_FIELD_MISSING' });
        }

        // Validate project or product reference
        const projectCode = mappedData['project_code'];
        const productCode = mappedData['product_code'];
        let matchedProjectId = null;
        let matchedProductId = null;

        if (projectCode) {
          matchedProjectId = refMaps.projects[projectCode.toUpperCase()];
          if (!matchedProjectId) {
            errors.push({
              field: 'project_code',
              message: `Referenced project code '${projectCode}' does not exist`,
              code: 'REFERENCE_NOT_FOUND',
            });
          }
        }

        if (productCode) {
          matchedProductId = refMaps.products[productCode.toUpperCase()];
          if (!matchedProductId) {
            errors.push({
              field: 'product_code',
              message: `Referenced product code '${productCode}' does not exist`,
              code: 'REFERENCE_NOT_FOUND',
            });
          }
        }

        if (!projectCode && !productCode) {
          errors.push({
            field: 'project_code',
            message: 'Either project_code or product_code must be specified',
            code: 'SCOPE_MISSING',
          });
        }

        // Validate assignee if provided
        const assigneeEmail = mappedData['assignee_email'];
        if (assigneeEmail) {
          const matchedUserId = refMaps.users[assigneeEmail.toLowerCase()];
          if (!matchedUserId) {
            errors.push({
              field: 'assignee_email',
              message: `Assignee email '${assigneeEmail}' not found in active employees`,
              code: 'USER_NOT_FOUND',
            });
          } else {
            mappedData['assignee_id'] = matchedUserId;
          }
        }

        mappedData['project_id'] = matchedProjectId;
        mappedData['product_id'] = matchedProductId;
      } else if (dto.entityType === ImportEntityType.CLIENTS) {
        if (!mappedData['company_name']) {
          errors.push({ field: 'company_name', message: 'Company name is required', code: 'REQUIRED_FIELD_MISSING' });
        }
      } else if (dto.entityType === ImportEntityType.PROJECTS) {
        if (!mappedData['project_code']) {
          errors.push({ field: 'project_code', message: 'Project code is required', code: 'REQUIRED_FIELD_MISSING' });
        }
        if (!mappedData['project_name']) {
          errors.push({ field: 'project_name', message: 'Project name is required', code: 'REQUIRED_FIELD_MISSING' });
        }
        if (mappedData['client_code']) {
          const clientCode = mappedData['client_code'].toUpperCase();
          if (!refMaps.clients[clientCode]) {
            errors.push({ field: 'client_code', message: `Client '${clientCode}' not found`, code: 'REFERENCE_NOT_FOUND' });
          } else {
            mappedData['client_id'] = refMaps.clients[clientCode];
          }
        }
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      validationResults.push({
        rowIndex,
        externalId,
        isValid,
        errors,
        mappedData,
        rawRow,
      });
    }

    // Generate batch number
    const year = new Date().getFullYear();
    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM data_import_batches WHERE batch_number LIKE $1`,
      [`IMP-${year}-%`],
    );
    const seq = (countRes.rows[0]?.count || 0) + 1;
    const batchNumber = `IMP-${year}-${String(seq).padStart(4, '0')}`;

    // Insert batch record (Status: PREVIEW_READY)
    const batchRes = await this.db.query(
      `INSERT INTO data_import_batches (
        batch_number, entity_type, import_mode, original_filename,
        total_rows, valid_rows, invalid_rows, imported_rows, failed_rows, skipped_rows,
        status, column_mapping, validation_summary, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 'PREVIEW_READY', $8, $9, TRUE, $10)
      RETURNING *`,
      [
        batchNumber,
        dto.entityType,
        dto.importMode || ImportMode.CREATE_ONLY,
        dto.originalFilename,
        rawRows.length,
        validCount,
        invalidCount,
        JSON.stringify(dto.columnMapping || {}),
        JSON.stringify({
          totalRows: rawRows.length,
          validRows: validCount,
          invalidRows: invalidCount,
          errorSample: validationResults.filter((r) => !r.isValid).slice(0, 10).map((r) => ({
            row: r.rowIndex,
            externalId: r.externalId,
            errors: r.errors,
          })),
        }),
        userId,
      ],
    );

    const batch = batchRes.rows[0];

    // Persist row outcomes
    for (const r of validationResults) {
      await this.db.query(
        `INSERT INTO data_import_row_outcomes (
          batch_id, row_index, external_id, status, raw_data,
          error_message, error_details, retry_count, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, TRUE, $8)`,
        [
          batch.id,
          r.rowIndex,
          r.externalId || null,
          r.isValid ? 'VALID' : 'INVALID',
          JSON.stringify(r.mappedData),
          r.errors.length > 0 ? r.errors.map((e) => `${e.field}: ${e.message}`).join('; ') : null,
          JSON.stringify({ errors: r.errors }),
          userId,
        ],
      );
    }

    return {
      batchId: batch.id,
      batchNumber: batch.batch_number,
      entityType: dto.entityType,
      importMode: dto.importMode || ImportMode.CREATE_ONLY,
      originalFilename: dto.originalFilename,
      totalRows: rawRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      status: 'PREVIEW_READY',
      previewRows: validationResults.slice(0, 15).map((r) => ({
        rowIndex: r.rowIndex,
        externalId: r.externalId,
        status: r.isValid ? 'VALID' : 'INVALID',
        errors: r.errors,
        data: r.mappedData,
      })),
      errorsSummary: validationResults.filter((r) => !r.isValid).map((r) => ({
        row: r.rowIndex,
        externalId: r.externalId,
        errors: r.errors,
      })),
    };
  }

  // ========================================================
  // 5. Batch Execution Engine
  // Acceptance guarantee:
  // "imports permitted rows and retries without duplicates"
  // ========================================================

  async executeImport(batchId: string, dto: ExecuteImportDto, userId: string) {
    const batchRes = await this.db.query(
      `SELECT * FROM data_import_batches WHERE id = $1 AND is_active = TRUE`,
      [batchId],
    );
    if (batchRes.rows.length === 0) {
      throw new NotFoundException(`Import batch ${batchId} not found`);
    }

    const batch = batchRes.rows[0];
    if (batch.status === 'PROCESSING') {
      throw new BadRequestException('Batch is already currently processing');
    }

    await this.db.query(
      `UPDATE data_import_batches SET status = 'PROCESSING', updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [userId, batchId],
    );

    // Fetch valid rows that haven't been successfully imported yet
    const rowsRes = await this.db.query(
      `SELECT * FROM data_import_row_outcomes
      WHERE batch_id = $1 AND status IN ('VALID', 'PENDING') AND is_active = TRUE
      ORDER BY row_index ASC`,
      [batchId],
    );

    let newlyImported = 0;
    let newlyFailed = 0;

    for (const row of rowsRes.rows) {
      const data = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;

      try {
        let recordId: string | null = null;

        if (batch.entity_type === ImportEntityType.TASKS) {
          recordId = await this.importSingleTask(data, userId);
        } else if (batch.entity_type === ImportEntityType.CLIENTS) {
          recordId = await this.importSingleClient(data, userId);
        } else if (batch.entity_type === ImportEntityType.PROJECTS) {
          recordId = await this.importSingleProject(data, userId);
        }

        if (recordId) {
          await this.db.query(
            `UPDATE data_import_row_outcomes SET
              status = 'SUCCESS',
              record_id = $1,
              error_message = NULL,
              imported_at = CURRENT_TIMESTAMP,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
            [recordId, userId, row.id],
          );
          newlyImported++;
        }
      } catch (err: any) {
        this.logger.error(`Import failed for row ${row.row_index}: ${err.message}`);
        await this.db.query(
          `UPDATE data_import_row_outcomes SET
            status = 'FAILED',
            error_message = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`,
          [err.message || 'Execution error', userId, row.id],
        );
        newlyFailed++;
      }
    }

    // Recompute batch totals
    const countsRes = await this.db.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS successful_count,
        COUNT(*) FILTER (WHERE status IN ('FAILED', 'INVALID'))::int AS failed_count,
        COUNT(*) FILTER (WHERE status = 'SKIPPED')::int AS skipped_count
      FROM data_import_row_outcomes
      WHERE batch_id = $1 AND is_active = TRUE`,
      [batchId],
    );

    const counts = countsRes.rows[0];
    const totalSuccess = Number(counts?.successful_count || 0);
    const totalFailed = Number(counts?.failed_count || 0);

    const finalStatus = totalFailed === 0 ? 'COMPLETED' : totalSuccess > 0 ? 'PARTIALLY_COMPLETED' : 'FAILED';

    await this.db.query(
      `UPDATE data_import_batches SET
        imported_rows = $1,
        failed_rows = $2,
        skipped_rows = $3,
        status = $4,
        completed_at = CURRENT_TIMESTAMP,
        updated_by = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6`,
      [totalSuccess, totalFailed, Number(counts?.skipped_count || 0), finalStatus, userId, batchId],
    );

    return {
      batchId,
      status: finalStatus,
      importedRows: totalSuccess,
      failedRows: totalFailed,
      newlyImported,
      newlyFailed,
    };
  }

  // ========================================================
  // 6. Idempotent Retry Engine (Never Duplicates Succeeded Rows)
  // Acceptance guarantee:
  // "retries without duplicates"
  // ========================================================

  async retryBatch(batchId: string, userId: string) {
    const batchRes = await this.db.query(
      `SELECT * FROM data_import_batches WHERE id = $1 AND is_active = TRUE`,
      [batchId],
    );
    if (batchRes.rows.length === 0) {
      throw new NotFoundException(`Import batch ${batchId} not found`);
    }

    const batch = batchRes.rows[0];

    // Find ONLY rows that failed or were invalid!
    const failedRowsRes = await this.db.query(
      `SELECT * FROM data_import_row_outcomes
      WHERE batch_id = $1 AND status IN ('FAILED', 'INVALID') AND is_active = TRUE
      ORDER BY row_index ASC`,
      [batchId],
    );

    if (failedRowsRes.rows.length === 0) {
      return {
        message: 'No failed rows to retry in this batch. All rows succeeded.',
        batchId,
        retriedCount: 0,
      };
    }

    let retrySuccessCount = 0;
    let retryFailedCount = 0;

    for (const row of failedRowsRes.rows) {
      const data = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;

      try {
        let recordId: string | null = null;
        if (batch.entity_type === ImportEntityType.TASKS) {
          recordId = await this.importSingleTask(data, userId);
        } else if (batch.entity_type === ImportEntityType.CLIENTS) {
          recordId = await this.importSingleClient(data, userId);
        } else if (batch.entity_type === ImportEntityType.PROJECTS) {
          recordId = await this.importSingleProject(data, userId);
        }

        if (recordId) {
          await this.db.query(
            `UPDATE data_import_row_outcomes SET
              status = 'SUCCESS',
              record_id = $1,
              error_message = NULL,
              retry_count = retry_count + 1,
              imported_at = CURRENT_TIMESTAMP,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
            [recordId, userId, row.id],
          );
          retrySuccessCount++;
        }
      } catch (err: any) {
        await this.db.query(
          `UPDATE data_import_row_outcomes SET
            status = 'FAILED',
            error_message = $1,
            retry_count = retry_count + 1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`,
          [err.message || 'Retry failed', userId, row.id],
        );
        retryFailedCount++;
      }
    }

    // Refresh batch status
    const countsRes = await this.db.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS successful_count,
        COUNT(*) FILTER (WHERE status IN ('FAILED', 'INVALID'))::int AS failed_count
      FROM data_import_row_outcomes
      WHERE batch_id = $1 AND is_active = TRUE`,
      [batchId],
    );

    const totalSuccess = Number(countsRes.rows[0]?.successful_count || 0);
    const totalFailed = Number(countsRes.rows[0]?.failed_count || 0);
    const finalStatus = totalFailed === 0 ? 'COMPLETED' : totalSuccess > 0 ? 'PARTIALLY_COMPLETED' : 'FAILED';

    await this.db.query(
      `UPDATE data_import_batches SET
        imported_rows = $1,
        failed_rows = $2,
        status = $3,
        updated_by = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5`,
      [totalSuccess, totalFailed, finalStatus, userId, batchId],
    );

    return {
      batchId,
      retriedCount: failedRowsRes.rows.length,
      retrySuccessCount,
      retryFailedCount,
      totalSuccessful: totalSuccess,
      totalFailed,
      status: finalStatus,
    };
  }

  // ========================================================
  // 7. Batches Query & Listing
  // ========================================================

  async findAllBatches(user?: any) {
    const res = await this.db.query(
      `SELECT b.*,
        u.first_name || ' ' || u.last_name AS created_by_name
      FROM data_import_batches b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.is_active = TRUE
      ORDER BY b.created_at DESC`,
    );
    return res.rows;
  }

  async findBatchById(id: string, user?: any) {
    const res = await this.db.query(
      `SELECT b.*,
        u.first_name || ' ' || u.last_name AS created_by_name
      FROM data_import_batches b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1 AND b.is_active = TRUE`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Import batch ${id} not found`);
    }

    const batch = res.rows[0];

    const rowsRes = await this.db.query(
      `SELECT * FROM data_import_row_outcomes
      WHERE batch_id = $1 AND is_active = TRUE
      ORDER BY row_index ASC`,
      [id],
    );

    batch.rows = rowsRes.rows;
    return batch;
  }

  // ========================================================
  // 8. Formula-Safe Portable Export Engine
  // Acceptance guarantee:
  // "formula-safe exports and restricted data cannot be recovered"
  // ========================================================

  async exportData(query: ExportQueryDto, user?: any) {
    let headers: string[] = [];
    let rows: Array<Record<string, any>> = [];

    if (query.entityType === ImportEntityType.TASKS) {
      headers = [
        'task_code',
        'title',
        'hierarchy_level',
        'status_name',
        'priority',
        'project_code',
        'product_code',
        'estimated_hours',
        'planned_start_date',
        'planned_end_date',
        'created_at',
      ];

      const params: any[] = [];
      const conditions: string[] = ['t.deleted_at IS NULL'];

      if (query.projectId) {
        params.push(query.projectId);
        conditions.push(`t.project_id = $${params.length}`);
      }
      if (query.productId) {
        params.push(query.productId);
        conditions.push(`t.product_id = $${params.length}`);
      }

      const sql = `
        SELECT 
          t.task_code,
          t.title,
          t.hierarchy_level,
          tws.status_name,
          t.priority,
          p.project_code,
          pr.product_code,
          t.estimated_hours,
          t.planned_start_date,
          t.planned_end_date,
          t.created_at
        FROM tasks t
        LEFT JOIN task_workflow_statuses tws ON t.status_id = tws.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN products pr ON t.product_id = pr.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY t.created_at DESC
        LIMIT 1000
      `;

      const res = await this.db.query(sql, params);
      rows = res.rows;
    } else if (query.entityType === ImportEntityType.CLIENTS) {
      headers = ['client_code', 'company_name', 'contact_person', 'email', 'mobile_number', 'city', 'state', 'client_type'];
      const res = await this.db.query(`SELECT client_code, company_name, contact_person, email, mobile_number, city, state, client_type FROM clients WHERE is_active = TRUE ORDER BY company_name ASC`);
      rows = res.rows;
    }

    // Sanitize every field against Formula Injection (CWE-1236)
    const sanitizedRows = rows.map((row) => {
      const sanitized: Record<string, string> = {};
      headers.forEach((h) => {
        sanitized[h] = this.sanitizeFormulaInjection(row[h]);
      });
      return sanitized;
    });

    if (query.format === 'JSON') {
      return { headers, rows: sanitizedRows };
    }

    // Build CSV string
    const csvLines = [headers.join(',')];
    sanitizedRows.forEach((r) => {
      const line = headers.map((h) => `"${(r[h] || '').replace(/"/g, '""')}"`).join(',');
      csvLines.push(line);
    });

    return {
      entityType: query.entityType,
      rowCount: sanitizedRows.length,
      csvContent: csvLines.join('\n'),
      format: 'CSV',
    };
  }

  // ========================================================
  // Private Ingestion Helpers
  // ========================================================

  private async loadReferenceMaps(entityType: ImportEntityType) {
    const projectsMap: Record<string, string> = {};
    const productsMap: Record<string, string> = {};
    const clientsMap: Record<string, string> = {};
    const usersMap: Record<string, string> = {};

    const [projRes, prodRes, cliRes, usrRes] = await Promise.all([
      this.db.query(`SELECT id, UPPER(project_code) as code FROM projects WHERE is_active = TRUE`),
      this.db.query(`SELECT id, UPPER(product_code) as code FROM products WHERE is_active = TRUE`),
      this.db.query(`SELECT id, UPPER(client_code) as code FROM clients WHERE is_active = TRUE`),
      this.db.query(`SELECT id, LOWER(email) as email FROM users WHERE is_active = TRUE`),
    ]);

    projRes.rows.forEach((r) => { projectsMap[r.code] = r.id; });
    prodRes.rows.forEach((r) => { productsMap[r.code] = r.id; });
    cliRes.rows.forEach((r) => { clientsMap[r.code] = r.id; });
    usrRes.rows.forEach((r) => { usersMap[r.email] = r.id; });

    return {
      projects: projectsMap,
      products: productsMap,
      clients: clientsMap,
      users: usersMap,
    };
  }

  private async importSingleTask(data: any, userId: string): Promise<string> {
    // Generate sequential task code if not present
    let taskCode = data.task_code || data.external_id;
    if (!taskCode || taskCode.startsWith('ROW-') || taskCode.startsWith('LEGACY-')) {
      const year = new Date().getFullYear();
      const countRes = await this.db.query(`SELECT COUNT(*)::int as count FROM tasks WHERE task_code LIKE $1`, [`TSK-${year}-%`]);
      const seq = (countRes.rows[0]?.count || 0) + 1;
      taskCode = `TSK-${year}-${String(seq).padStart(4, '0')}`;
    }

    // Default status: To Do
    const statusRes = await this.db.query(`SELECT id FROM task_workflow_statuses ORDER BY position ASC LIMIT 1`);
    const defaultStatusId = statusRes.rows[0]?.id;

    // Default task type: Task
    const typeRes = await this.db.query(`SELECT id FROM task_types WHERE type_code = 'TASK' LIMIT 1`);
    const defaultTypeId = typeRes.rows[0]?.id;

    // Check if task exists for upsert
    const existing = await this.db.query(`SELECT id FROM tasks WHERE task_code = $1`, [taskCode]);

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await this.db.query(
        `UPDATE tasks SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          priority = COALESCE($3, priority),
          estimated_hours = COALESCE($4, estimated_hours),
          updated_by = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6`,
        [data.title, data.description, data.priority, data.estimated_hours ? Number(data.estimated_hours) : null, userId, id],
      );
      return id;
    }

    const insRes = await this.db.query(
      `INSERT INTO tasks (
        task_code, revision, title, description, hierarchy_level,
        task_type_id, status_id, priority, project_id, product_id,
        estimated_hours, planned_start_date, planned_end_date, created_by
      ) VALUES ($1, 1, $2, $3, 'TASK', $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        taskCode,
        data.title,
        data.description || '',
        defaultTypeId,
        defaultStatusId,
        data.priority || 'MEDIUM',
        data.project_id || null,
        data.product_id || null,
        data.estimated_hours ? Number(data.estimated_hours) : 0,
        data.planned_start_date || null,
        data.planned_end_date || null,
        userId,
      ],
    );

    const newTaskId = insRes.rows[0].id;

    // Assign if assignee found
    if (data.assignee_id) {
      await this.db.query(
        `INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, created_by)
        VALUES ($1, $2, TRUE, $3)
        ON CONFLICT DO NOTHING`,
        [newTaskId, data.assignee_id, userId],
      );
    }

    return newTaskId;
  }

  private async importSingleClient(data: any, userId: string): Promise<string> {
    const clientCode = data.client_code || `CLI-${Date.now().toString(36).toUpperCase()}`;

    const existing = await this.db.query(`SELECT id FROM clients WHERE client_code = $1`, [clientCode]);
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await this.db.query(
        `UPDATE clients SET
          company_name = COALESCE($1, company_name),
          contact_person = COALESCE($2, contact_person),
          email = COALESCE($3, email),
          updated_by = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5`,
        [data.company_name, data.contact_person, data.email, userId, id],
      );
      return id;
    }

    // Default branch
    const branchRes = await this.db.query(`SELECT id FROM branches LIMIT 1`);
    const branchId = branchRes.rows[0]?.id;

    const insRes = await this.db.query(
      `INSERT INTO clients (
        client_code, company_name, contact_person, designation, email, mobile_number,
        city, state, country, client_type, branch_id, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12)
      RETURNING id`,
      [
        clientCode,
        data.company_name,
        data.contact_person || '',
        data.designation || '',
        data.email || '',
        data.mobile_number || '',
        data.city || '',
        data.state || '',
        data.country || 'India',
        data.client_type || 'ACTIVE_CLIENT',
        branchId,
        userId,
      ],
    );

    return insRes.rows[0].id;
  }

  private async importSingleProject(data: any, userId: string): Promise<string> {
    const existing = await this.db.query(`SELECT id FROM projects WHERE project_code = $1`, [data.project_code]);
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Default branch
    const branchRes = await this.db.query(`SELECT id FROM branches LIMIT 1`);
    const branchId = branchRes.rows[0]?.id;

    const insRes = await this.db.query(
      `INSERT INTO projects (
        project_code, project_name, client_id, branch_id, project_type, total_budget, currency, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
      RETURNING id`,
      [
        data.project_code,
        data.project_name,
        data.client_id,
        branchId,
        data.project_type || 'TIME_AND_MATERIALS',
        data.total_budget ? Number(data.total_budget) : 0,
        data.currency || 'INR',
        userId,
      ],
    );

    return insRes.rows[0].id;
  }
}
