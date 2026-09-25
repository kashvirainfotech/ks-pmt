import { validateDateRanges } from '../../common/validators/date-ranges';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MapProductClientDto } from './dto/map-product-client.dto';
import { UpdateProductClientDto } from './dto/update-product-client.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  // ----------------------------------------------------
  // Product Master
  // ----------------------------------------------------

  async create(dto: CreateProductDto, userId: string) {
    validateDateRanges(dto);
    const checkQuery = `SELECT id FROM products WHERE product_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.productCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(
        `Product code '${dto.productCode}' already exists.`,
      );
    }

    const insertQuery = `
      INSERT INTO products (
        product_code, product_name, description, category,
        current_version, base_license_price, standard_amc_percentage,
        currency, product_manager_user_id, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $10)
      RETURNING *;
    `;
    const result = await this.db.writeWithFields(
      insertQuery,
      [
        dto.productCode,
        dto.productName,
        dto.description || null,
        dto.category || null,
        dto.currentVersion || null,
        dto.baseLicensePrice || 0.0,
        dto.standardAmcPercentage ?? 18.0,
        dto.currency || 'INR',
        dto.productManagerUserId || null,
        userId,
      ],
      'products',
      {
        tech_stack: dto.techStack,
        documentation_links: dto.documentationLinks,
        subscription_plans: dto.subscriptionPlans,
        implementation_fee: dto.implementationFee,
      },
    );

    return result.rows[0];
  }

  async findAll(includeInactive = false) {
    const query = `
      SELECT 
        pr.*,
        CONCAT(u.first_name, ' ', u.last_name) AS product_manager_name,
        COUNT(DISTINCT pcm.client_id) AS total_licensed_clients,
        COUNT(DISTINCT CASE WHEN pcm.status = 'ACTIVE' THEN pcm.id END) AS active_licenses_count,
        COALESCE(SUM(pcm.contract_value) FILTER (WHERE pcm.status = 'ACTIVE'), 0.00) AS total_active_contract_value,
        COALESCE(SUM(pcm.amc_amount) FILTER (WHERE pcm.status = 'ACTIVE'), 0.00) AS total_annual_amc_value
      FROM products pr
      LEFT JOIN users u ON pr.product_manager_user_id = u.id
      LEFT JOIN product_client_mappings pcm ON pr.id = pcm.product_id AND pcm.is_active = TRUE
      WHERE ($1::BOOLEAN = TRUE OR pr.is_active = TRUE)
      GROUP BY pr.id, u.first_name, u.last_name
      ORDER BY pr.product_name ASC;
    `;
    const result = await this.db.query(query, [includeInactive]);
    return result.rows;
  }

  async findOne(id: string) {
    const query = `
      SELECT 
        pr.*,
        CONCAT(u.first_name, ' ', u.last_name) AS product_manager_name,
        u.email AS product_manager_email
      FROM products pr
      LEFT JOIN users u ON pr.product_manager_user_id = u.id
      WHERE pr.id = $1;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }

    const product = result.rows[0];

    // Fetch mapped clients
    const clientsQuery = `
      SELECT 
        pcm.id AS mapping_id,
        c.id AS client_id,
        c.client_code,
        c.company_name,
        c.contact_person,
        c.email,
        pcm.license_type,
        pcm.contract_value,
        pcm.amc_amount,
        pcm.currency,
        pcm.license_start_date,
        pcm.license_end_date,
        pcm.amc_renewal_date,
        pcm.status AS license_status,
        pcm.notes
      FROM product_client_mappings pcm
      INNER JOIN clients c ON pcm.client_id = c.id
      WHERE pcm.product_id = $1 AND pcm.is_active = TRUE
      ORDER BY pcm.license_start_date DESC;
    `;
    const clientsResult = await this.db.query(clientsQuery, [id]);

    // Fetch versions
    const versionsQuery = `
      SELECT id, version_code, version_name, target_release_date, status
      FROM versions
      WHERE product_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC;
    `;
    const versionsResult = await this.db.query(versionsQuery, [id]);

    return {
      ...product,
      licensedClients: clientsResult.rows,
      versions: versionsResult.rows,
    };
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    const existing = await this.findOne(id);
    validateDateRanges(dto, existing);

    const updateQuery = `
      UPDATE products SET
        product_name = COALESCE($1, product_name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        current_version = COALESCE($4, current_version),
        base_license_price = COALESCE($5, base_license_price),
        standard_amc_percentage = COALESCE($6, standard_amc_percentage),
        currency = COALESCE($7, currency),
        product_manager_user_id = COALESCE($8, product_manager_user_id),
        is_active = COALESCE($9, is_active),
        updated_by = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *;
    `;
    const result = await this.db.writeWithFields(
      updateQuery,
      [
        dto.productName,
        dto.description,
        dto.category,
        dto.currentVersion,
        dto.baseLicensePrice,
        dto.standardAmcPercentage,
        dto.currency,
        dto.productManagerUserId,
        dto.isActive,
        userId,
        id,
      ],
      'products',
      {
        tech_stack: dto.techStack,
        documentation_links: dto.documentationLinks,
        subscription_plans: dto.subscriptionPlans,
        implementation_fee: dto.implementationFee,
      },
    );

    return result.rows[0];
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.findOne(id);
    const query = `
      UPDATE products SET
        is_active = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const result = await this.db.query(query, [isActive, userId, id]);
    return result.rows[0];
  }

  // ----------------------------------------------------
  // Product Client License Mappings
  // ----------------------------------------------------

  async mapClient(productId: string, dto: MapProductClientDto, userId: string) {
    validateDateRanges(dto);
    await this.findOne(productId);

    const insertQuery = `
      INSERT INTO product_client_mappings (
        product_id, client_id, license_type, contract_value,
        amc_amount, currency, license_start_date, license_end_date,
        amc_renewal_date, status, notes, is_active,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12, $12
      )
      RETURNING *;
    `;

    const result = await this.db.writeWithFields(
      insertQuery,
      [
        productId,
        dto.clientId,
        dto.licenseType,
        dto.contractValue,
        dto.amcAmount || 0.0,
        dto.currency || 'INR',
        dto.licenseStartDate,
        dto.licenseEndDate || null,
        dto.amcRenewalDate || null,
        dto.status || 'ACTIVE',
        dto.notes || null,
        userId,
      ],
      'product_client_mappings',
      { support_tier: dto.supportTier },
    );

    return result.rows[0];
  }

  async findMappedClients(productId: string) {
    const query = `
      SELECT 
        pcm.*,
        c.client_code,
        c.company_name,
        c.contact_person,
        c.email,
        c.mobile_number
      FROM product_client_mappings pcm
      INNER JOIN clients c ON pcm.client_id = c.id
      WHERE pcm.product_id = $1 AND pcm.is_active = TRUE
      ORDER BY pcm.license_start_date DESC;
    `;
    const result = await this.db.query(query, [productId]);
    return result.rows;
  }

  async updateClientMapping(
    mappingId: string,
    dto: UpdateProductClientDto,
    userId: string,
  ) {
    const checkQuery = `SELECT id FROM product_client_mappings WHERE id = $1;`;
    const checkResult = await this.db.query(checkQuery, [mappingId]);
    if (checkResult.rowCount === 0) {
      throw new NotFoundException(
        `Product-Client mapping with ID ${mappingId} not found.`,
      );
    }

    const updateQuery = `
      UPDATE product_client_mappings SET
        license_type = COALESCE($1, license_type),
        contract_value = COALESCE($2, contract_value),
        amc_amount = COALESCE($3, amc_amount),
        currency = COALESCE($4, currency),
        license_start_date = COALESCE($5, license_start_date),
        license_end_date = COALESCE($6, license_end_date),
        amc_renewal_date = COALESCE($7, amc_renewal_date),
        status = COALESCE($8, status),
        notes = COALESCE($9, notes),
        is_active = COALESCE($10, is_active),
        updated_by = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *;
    `;

    const result = await this.db.writeWithFields(
      updateQuery,
      [
        dto.licenseType,
        dto.contractValue,
        dto.amcAmount,
        dto.currency,
        dto.licenseStartDate,
        dto.licenseEndDate,
        dto.amcRenewalDate,
        dto.status,
        dto.notes,
        dto.isActive,
        userId,
        mappingId,
      ],
      'product_client_mappings',
      { support_tier: dto.supportTier },
    );

    return result.rows[0];
  }

  async removeClientMapping(mappingId: string) {
    const query = `
      UPDATE product_client_mappings SET
        status = 'TERMINATED',
        is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const result = await this.db.query(query, [mappingId]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Mapping with ID ${mappingId} not found.`);
    }
    return { success: true, message: 'License terminated' };
  }
}
