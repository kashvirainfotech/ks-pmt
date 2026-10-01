import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateKnowledgeDocDto,
  KnowledgeCategory,
  KnowledgeDocStatus,
  KnowledgeEntityType,
  UpdateKnowledgeDocDto,
} from './dto/create-knowledge-doc.dto';
import { CreateKnowledgeRevisionDto } from './dto/create-revision.dto';
import { LinkKnowledgeEntityDto } from './dto/link-entity.dto';
import { AddKnowledgeAttachmentDto } from './dto/attachment.dto';
import { QueryKnowledgeDto } from './dto/query-knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(private readonly db: DatabaseService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ========================================================
  // 1. Knowledge Document Lifecycle
  // ========================================================

  async createDocument(dto: CreateKnowledgeDocDto, userId: string) {
    const entityType = dto.entityType || KnowledgeEntityType.GLOBAL;

    if (entityType === KnowledgeEntityType.GLOBAL && (dto.productId || dto.projectId)) {
      throw new BadRequestException(
        'For GLOBAL documents, productId and projectId must be null.',
      );
    }
    if (entityType === KnowledgeEntityType.PRODUCT && (!dto.productId || dto.projectId)) {
      throw new BadRequestException(
        'For PRODUCT documents, productId must be provided and projectId must be null.',
      );
    }
    if (entityType === KnowledgeEntityType.PROJECT && (!dto.projectId || dto.productId)) {
      throw new BadRequestException(
        'For PROJECT documents, projectId must be provided and productId must be null.',
      );
    }

    const docPrefix =
      dto.category === KnowledgeCategory.ARCHITECTURE_DECISION
        ? 'ADR'
        : dto.category === KnowledgeCategory.SPECIFICATION
          ? 'SPEC'
          : dto.category === KnowledgeCategory.RUNBOOK
            ? 'RUN'
            : 'DOC';

    const documentCode =
      dto.documentCode ||
      `${docPrefix}-${Date.now().toString().slice(-6)}`;

    const slug = `${this.slugify(dto.title)}-${Date.now().toString().slice(-4)}`;

    // Insert knowledge_documents
    const docRes = await this.db.query(
      `INSERT INTO knowledge_documents (
        document_code, title, slug, category, entity_type, product_id, project_id,
        component_id, audience, current_version, status, decision_outcome,
        superseded_by_document_id, owner_user_id, tags, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $11, $12, $13, $14, TRUE, $15, $15
      ) RETURNING *`,
      [
        documentCode,
        dto.title,
        slug,
        dto.category,
        entityType,
        dto.productId || null,
        dto.projectId || null,
        dto.componentId || null,
        dto.audience || 'INTERNAL_ONLY',
        dto.status || 'DRAFT',
        dto.decisionOutcome || null,
        dto.supersededByDocumentId || null,
        dto.ownerUserId || userId,
        dto.tags || [],
        userId,
      ],
    );

    const doc = docRes.rows[0];

    // Insert first revision
    const revRes = await this.db.query(
      `INSERT INTO knowledge_document_revisions (
        document_id, revision_number, title, content_markdown, change_summary,
        author_user_id, is_active, created_by, updated_by
      ) VALUES (
        $1, 1, $2, $3, $4, $5, TRUE, $6, $6
      ) RETURNING *`,
      [
        doc.id,
        dto.title,
        dto.contentMarkdown,
        dto.changeSummary || 'Initial document creation',
        userId,
        userId,
      ],
    );

    return {
      ...doc,
      latest_revision: revRes.rows[0],
    };
  }

  async getDocuments(query: QueryKnowledgeDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const where: string[] = ['kd.is_active = TRUE'];

    if (query.category) {
      params.push(query.category);
      where.push(`kd.category = $${params.length}`);
    }
    if (query.entityType) {
      params.push(query.entityType);
      where.push(`kd.entity_type = $${params.length}`);
    }
    if (query.productId) {
      params.push(query.productId);
      where.push(`kd.product_id = $${params.length}`);
    }
    if (query.projectId) {
      params.push(query.projectId);
      where.push(`kd.project_id = $${params.length}`);
    }
    if (query.audience) {
      params.push(query.audience);
      where.push(`kd.audience = $${params.length}`);
    }
    if (query.status) {
      params.push(query.status);
      where.push(`kd.status = $${params.length}`);
    }
    if (query.tag) {
      params.push(query.tag);
      where.push(`$${params.length} = ANY(kd.tags)`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(
        `(kd.document_code ILIKE $${params.length} OR kd.title ILIKE $${params.length} OR kd.slug ILIKE $${params.length})`,
      );
    }

    const countSql = `
      SELECT COUNT(*)::INTEGER AS total
      FROM knowledge_documents kd
      WHERE ${where.join(' AND ')}
    `;
    const countRes = await this.db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const selectParams = [...params, limit, offset];
    const dataSql = `
      SELECT
        kd.*,
        p.project_name,
        pr.product_name,
        sc.component_name,
        CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
        u.email AS owner_email,
        (
          SELECT COUNT(*)::INTEGER
          FROM knowledge_document_revisions kdr
          WHERE kdr.document_id = kd.id AND kdr.is_active = TRUE
        ) AS revision_count,
        (
          SELECT COUNT(*)::INTEGER
          FROM knowledge_document_links kdl
          WHERE kdl.document_id = kd.id AND kdl.is_active = TRUE
        ) AS links_count,
        (
          SELECT COUNT(*)::INTEGER
          FROM knowledge_document_attachments kda
          WHERE kda.document_id = kd.id AND kda.is_active = TRUE
        ) AS attachments_count
      FROM knowledge_documents kd
      LEFT JOIN projects p ON kd.project_id = p.id
      LEFT JOIN products pr ON kd.product_id = pr.id
      LEFT JOIN software_components sc ON kd.component_id = sc.id
      LEFT JOIN users u ON kd.owner_user_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY kd.updated_at DESC
      LIMIT $${selectParams.length - 1} OFFSET $${selectParams.length}
    `;

    const dataRes = await this.db.query(dataSql, selectParams);

    return {
      data: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDocumentById(id: string) {
    const docRes = await this.db.query(
      `SELECT
        kd.*,
        p.project_name,
        pr.product_name,
        sc.component_name,
        CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
        u.email AS owner_email,
        sup.title AS superseded_by_title,
        sup.document_code AS superseded_by_code
      FROM knowledge_documents kd
      LEFT JOIN projects p ON kd.project_id = p.id
      LEFT JOIN products pr ON kd.product_id = pr.id
      LEFT JOIN software_components sc ON kd.component_id = sc.id
      LEFT JOIN users u ON kd.owner_user_id = u.id
      LEFT JOIN knowledge_documents sup ON kd.superseded_by_document_id = sup.id
      WHERE kd.id = $1 AND kd.is_active = TRUE`,
      [id],
    );

    if (docRes.rows.length === 0) {
      throw new NotFoundException(`Knowledge document not found`);
    }

    const doc = docRes.rows[0];

    // Fetch latest revision
    const latestRevRes = await this.db.query(
      `SELECT kdr.*, CONCAT(u.first_name, ' ', u.last_name) AS author_name
       FROM knowledge_document_revisions kdr
       LEFT JOIN users u ON kdr.author_user_id = u.id
       WHERE kdr.document_id = $1 AND kdr.revision_number = $2 AND kdr.is_active = TRUE`,
      [id, doc.current_version],
    );

    // Fetch all revision histories (summaries)
    const allRevsRes = await this.db.query(
      `SELECT
        kdr.id, kdr.document_id, kdr.revision_number, kdr.title, kdr.change_summary,
        kdr.created_at, kdr.author_user_id, CONCAT(u.first_name, ' ', u.last_name) AS author_name
       FROM knowledge_document_revisions kdr
       LEFT JOIN users u ON kdr.author_user_id = u.id
       WHERE kdr.document_id = $1 AND kdr.is_active = TRUE
       ORDER BY kdr.revision_number DESC`,
      [id],
    );

    // Fetch linked entities with metadata
    const linksRes = await this.db.query(
      `SELECT
        kdl.*,
        CASE
          WHEN kdl.linked_entity_type = 'TASK' THEN (SELECT t.task_code || ' - ' || t.title FROM tasks t WHERE t.id = kdl.linked_entity_id)
          WHEN kdl.linked_entity_type = 'VERSION' THEN (SELECT v.version_name FROM versions v WHERE v.id = kdl.linked_entity_id)
          WHEN kdl.linked_entity_type = 'MILESTONE' THEN (SELECT m.name FROM milestones m WHERE m.id = kdl.linked_entity_id)
          WHEN kdl.linked_entity_type = 'REQUIREMENT_CRITERION' THEN (SELECT rac.criteria_code || ' - ' || rac.title FROM requirement_acceptance_criteria rac WHERE rac.id = kdl.linked_entity_id)
          WHEN kdl.linked_entity_type = 'CHANGE_REQUEST' THEN (SELECT cr.cr_number || ' - ' || cr.title FROM change_requests cr WHERE cr.id = kdl.linked_entity_id)
          ELSE 'Unknown Target'
        END AS linked_entity_label
       FROM knowledge_document_links kdl
       WHERE kdl.document_id = $1 AND kdl.is_active = TRUE
       ORDER BY kdl.created_at DESC`,
      [id],
    );

    // Fetch attachments
    const attachRes = await this.db.query(
      `SELECT kda.*
       FROM knowledge_document_attachments kda
       WHERE kda.document_id = $1 AND kda.is_active = TRUE
       ORDER BY kda.created_at DESC`,
      [id],
    );

    return {
      ...doc,
      latest_revision: latestRevRes.rows[0] || null,
      revisions: allRevsRes.rows,
      links: linksRes.rows,
      attachments: attachRes.rows,
    };
  }

  async updateDocument(id: string, dto: UpdateKnowledgeDocDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM knowledge_documents WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (existing.rows.length === 0) {
      throw new NotFoundException(`Knowledge document not found`);
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP', 'updated_by = $2'];
    const params: any[] = [id, userId];

    if (dto.title !== undefined) {
      params.push(dto.title);
      updates.push(`title = $${params.length}`);
    }
    if (dto.category !== undefined) {
      params.push(dto.category);
      updates.push(`category = $${params.length}`);
    }
    if (dto.audience !== undefined) {
      params.push(dto.audience);
      updates.push(`audience = $${params.length}`);
    }
    if (dto.status !== undefined) {
      params.push(dto.status);
      updates.push(`status = $${params.length}`);
    }
    if (dto.decisionOutcome !== undefined) {
      params.push(dto.decisionOutcome);
      updates.push(`decision_outcome = $${params.length}`);
    }
    if (dto.supersededByDocumentId !== undefined) {
      params.push(dto.supersededByDocumentId);
      updates.push(`superseded_by_document_id = $${params.length}`);
    }
    if (dto.ownerUserId !== undefined) {
      params.push(dto.ownerUserId);
      updates.push(`owner_user_id = $${params.length}`);
    }
    if (dto.tags !== undefined) {
      params.push(dto.tags);
      updates.push(`tags = $${params.length}`);
    }

    const res = await this.db.query(
      `UPDATE knowledge_documents SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );

    return res.rows[0];
  }

  async deleteDocument(id: string, userId: string) {
    const res = await this.db.query(
      `UPDATE knowledge_documents
       SET is_active = FALSE, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = TRUE
       RETURNING id, document_code, title`,
      [id, userId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Knowledge document not found`);
    }

    return { success: true, message: 'Document deleted successfully', document: res.rows[0] };
  }

  // ========================================================
  // 2. Document Revision Versioning & Diffs
  // ========================================================

  async addRevision(documentId: string, dto: CreateKnowledgeRevisionDto, userId: string) {
    const docRes = await this.db.query(
      `SELECT * FROM knowledge_documents WHERE id = $1 AND is_active = TRUE`,
      [documentId],
    );
    if (docRes.rows.length === 0) {
      throw new NotFoundException(`Knowledge document not found`);
    }

    const doc = docRes.rows[0];
    const nextRev = doc.current_version + 1;
    const title = dto.title || doc.title;

    const revRes = await this.db.query(
      `INSERT INTO knowledge_document_revisions (
        document_id, revision_number, title, content_markdown, change_summary,
        author_user_id, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, TRUE, $7, $7
      ) RETURNING *`,
      [
        documentId,
        nextRev,
        title,
        dto.contentMarkdown,
        dto.changeSummary || `Updated to revision ${nextRev}`,
        userId,
        userId,
      ],
    );

    // Update document current_version and title
    await this.db.query(
      `UPDATE knowledge_documents
       SET current_version = $2, title = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [documentId, nextRev, title, userId],
    );

    return revRes.rows[0];
  }

  async getRevision(documentId: string, revisionNumber: number) {
    const res = await this.db.query(
      `SELECT kdr.*, CONCAT(u.first_name, ' ', u.last_name) AS author_name, u.email AS author_email
       FROM knowledge_document_revisions kdr
       LEFT JOIN users u ON kdr.author_user_id = u.id
       WHERE kdr.document_id = $1 AND kdr.revision_number = $2 AND kdr.is_active = TRUE`,
      [documentId, revisionNumber],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Revision ${revisionNumber} not found for this document`);
    }

    return res.rows[0];
  }

  async getRevisionDiff(documentId: string, baseRev: number, targetRev: number) {
    const base = await this.getRevision(documentId, baseRev);
    const target = await this.getRevision(documentId, targetRev);

    return {
      documentId,
      baseRevision: base,
      targetRevision: target,
    };
  }

  // ========================================================
  // 3. Work Item Linking
  // ========================================================

  async addLink(documentId: string, dto: LinkKnowledgeEntityDto, userId: string) {
    const docCheck = await this.db.query(
      `SELECT id FROM knowledge_documents WHERE id = $1 AND is_active = TRUE`,
      [documentId],
    );
    if (docCheck.rows.length === 0) {
      throw new NotFoundException(`Knowledge document not found`);
    }

    const res = await this.db.query(
      `INSERT INTO knowledge_document_links (
        document_id, linked_entity_type, linked_entity_id, link_notes, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, TRUE, $5, $5
      )
      ON CONFLICT (document_id, linked_entity_type, linked_entity_id)
      DO UPDATE SET link_notes = EXCLUDED.link_notes, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP, is_active = TRUE
      RETURNING *`,
      [documentId, dto.linkedEntityType, dto.linkedEntityId, dto.linkNotes || null, userId],
    );

    return res.rows[0];
  }

  async removeLink(documentId: string, linkId: string) {
    const res = await this.db.query(
      `DELETE FROM knowledge_document_links WHERE id = $1 AND document_id = $2 RETURNING id`,
      [linkId, documentId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Link record not found`);
    }
    return { success: true, message: 'Link removed successfully' };
  }

  // ========================================================
  // 4. Attachments
  // ========================================================

  async addAttachment(documentId: string, dto: AddKnowledgeAttachmentDto, userId: string) {
    const docCheck = await this.db.query(
      `SELECT current_version FROM knowledge_documents WHERE id = $1 AND is_active = TRUE`,
      [documentId],
    );
    if (docCheck.rows.length === 0) {
      throw new NotFoundException(`Knowledge document not found`);
    }

    const rev = dto.revisionNumber || docCheck.rows[0].current_version;

    const res = await this.db.query(
      `INSERT INTO knowledge_document_attachments (
        document_id, revision_number, file_name, s3_key, s3_bucket, mime_type, file_size_bytes,
        is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, TRUE, $8, $8
      ) RETURNING *`,
      [
        documentId,
        rev,
        dto.fileName,
        dto.s3Key,
        dto.s3Bucket || 'ks-pmt-documents',
        dto.mimeType,
        dto.fileSizeBytes,
        userId,
      ],
    );

    return res.rows[0];
  }

  async deleteAttachment(documentId: string, attachmentId: string) {
    const res = await this.db.query(
      `DELETE FROM knowledge_document_attachments WHERE id = $1 AND document_id = $2 RETURNING id`,
      [attachmentId, documentId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Attachment not found`);
    }
    return { success: true, message: 'Attachment deleted successfully' };
  }
}
