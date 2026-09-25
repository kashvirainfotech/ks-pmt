import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateClientDto, userId: string) {
    const checkQuery = `SELECT id FROM clients WHERE client_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.clientCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(`Client code '${dto.clientCode}' already exists.`);
    }

    const insertQuery = `
      INSERT INTO clients (
        client_code, company_name, contact_person, designation,
        email, mobile_number, alternate_phone, website, address,
        city, state, country, postal_code, tax_id_or_gst,
        client_type, account_manager_user_id, branch_id,
        is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, TRUE, $18, $18
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      dto.clientCode,
      dto.companyName,
      dto.contactPerson,
      dto.designation || null,
      dto.email.toLowerCase(),
      dto.mobileNumber,
      dto.alternatePhone || null,
      dto.website || null,
      dto.address || null,
      dto.city,
      dto.state,
      dto.country || 'India',
      dto.postalCode || null,
      dto.taxIdOrGst || null,
      dto.clientType || 'PROSPECT',
      dto.accountManagerUserId || null,
      dto.branchId,
      userId,
    ]);

    return result.rows[0];
  }

  async findAll(query: QueryClientDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const whereClauses: string[] = [];

    if (!query.includeInactive) {
      whereClauses.push('c.is_active = TRUE');
    }

    if (query.clientType) {
      params.push(query.clientType);
      whereClauses.push(`c.client_type = $${params.length}`);
    }

    if (query.branchId) {
      params.push(query.branchId);
      whereClauses.push(`c.branch_id = $${params.length}`);
    }

    if (query.accountManagerUserId) {
      params.push(query.accountManagerUserId);
      whereClauses.push(`c.account_manager_user_id = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      whereClauses.push(`(
        c.client_code ILIKE $${params.length} OR
        c.company_name ILIKE $${params.length} OR
        c.contact_person ILIKE $${params.length} OR
        c.email ILIKE $${params.length}
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(c.id) AS total FROM clients c ${whereSql};`;
    const countResult = await this.db.query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalRecords / limit);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT 
        c.*,
        b.branch_name,
        CONCAT(u.first_name, ' ', u.last_name) AS account_manager_name,
        COUNT(DISTINCT pcm.product_id) AS mapped_products_count,
        COUNT(DISTINCT p.id) AS active_projects_count
      FROM clients c
      INNER JOIN branches b ON c.branch_id = b.id
      LEFT JOIN users u ON c.account_manager_user_id = u.id
      LEFT JOIN product_client_mappings pcm ON c.id = pcm.client_id AND pcm.is_active = TRUE
      LEFT JOIN projects p ON c.id = p.client_id AND p.is_active = TRUE
      ${whereSql}
      GROUP BY c.id, b.branch_name, u.first_name, u.last_name
      ORDER BY c.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const dataResult = await this.db.query(dataSql, params);

    return {
      data: dataResult.rows,
      meta: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const clientQuery = `
      SELECT 
        c.*,
        b.branch_name,
        CONCAT(u.first_name, ' ', u.last_name) AS account_manager_name,
        u.email AS account_manager_email
      FROM clients c
      INNER JOIN branches b ON c.branch_id = b.id
      LEFT JOIN users u ON c.account_manager_user_id = u.id
      WHERE c.id = $1;
    `;
    const clientResult = await this.db.query(clientQuery, [id]);
    if (clientResult.rowCount === 0) {
      throw new NotFoundException(`Client with ID ${id} not found.`);
    }

    const client = clientResult.rows[0];

    // Mapped Products & Licenses
    const productsQuery = `
      SELECT 
        pcm.id AS mapping_id,
        pr.id AS product_id,
        pr.product_code,
        pr.product_name,
        pcm.license_type,
        pcm.contract_value,
        pcm.amc_amount,
        pcm.currency,
        pcm.license_start_date,
        pcm.license_end_date,
        pcm.amc_renewal_date,
        pcm.status AS license_status
      FROM product_client_mappings pcm
      INNER JOIN products pr ON pcm.product_id = pr.id
      WHERE pcm.client_id = $1 AND pcm.is_active = TRUE
      ORDER BY pcm.license_start_date DESC;
    `;
    const productsResult = await this.db.query(productsQuery, [id]);

    // Custom Development Projects
    const projectsQuery = `
      SELECT 
        p.id AS project_id,
        p.project_code,
        p.project_name,
        p.billing_type,
        p.contract_amount,
        p.currency,
        p.project_status,
        p.planned_start_date,
        p.planned_end_date,
        CONCAT(mgr.first_name, ' ', mgr.last_name) AS project_manager_name
      FROM projects p
      INNER JOIN users mgr ON p.project_manager_user_id = mgr.id
      WHERE p.client_id = $1 AND p.is_active = TRUE
      ORDER BY p.created_at DESC;
    `;
    const projectsResult = await this.db.query(projectsQuery, [id]);

    return {
      ...client,
      mappedProducts: productsResult.rows,
      projects: projectsResult.rows,
    };
  }

  async update(id: string, dto: UpdateClientDto, userId: string) {
    await this.findOne(id);

    const updateQuery = `
      UPDATE clients SET
        company_name = COALESCE($1, company_name),
        contact_person = COALESCE($2, contact_person),
        designation = COALESCE($3, designation),
        email = COALESCE($4, email),
        mobile_number = COALESCE($5, mobile_number),
        alternate_phone = COALESCE($6, alternate_phone),
        website = COALESCE($7, website),
        address = COALESCE($8, address),
        city = COALESCE($9, city),
        state = COALESCE($10, state),
        country = COALESCE($11, country),
        postal_code = COALESCE($12, postal_code),
        tax_id_or_gst = COALESCE($13, tax_id_or_gst),
        client_type = COALESCE($14, client_type),
        account_manager_user_id = COALESCE($15, account_manager_user_id),
        branch_id = COALESCE($16, branch_id),
        is_active = COALESCE($17, is_active),
        updated_by = $18,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [
      dto.companyName,
      dto.contactPerson,
      dto.designation,
      dto.email ? dto.email.toLowerCase() : undefined,
      dto.mobileNumber,
      dto.alternatePhone,
      dto.website,
      dto.address,
      dto.city,
      dto.state,
      dto.country,
      dto.postalCode,
      dto.taxIdOrGst,
      dto.clientType,
      dto.accountManagerUserId,
      dto.branchId,
      dto.isActive,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async convertToActive(id: string, userId: string) {
    const client = await this.findOne(id);
    if (client.client_type === 'ACTIVE_CLIENT') {
      throw new BadRequestException('This client is already marked as an ACTIVE_CLIENT.');
    }

    const query = `
      UPDATE clients SET
        client_type = 'ACTIVE_CLIENT',
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const result = await this.db.query(query, [userId, id]);
    return result.rows[0];
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.findOne(id);
    const query = `
      UPDATE clients SET
        is_active = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const result = await this.db.query(query, [isActive, userId, id]);
    return result.rows[0];
  }
}
