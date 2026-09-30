import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateProductIdeaDto,
  ProductIdeaStatus,
  RoadmapBucket,
  ProductIdeaVisibility,
} from './dto/create-product-idea.dto';
import { UpdateProductIdeaDto } from './dto/update-product-idea.dto';
import { ScoreProductIdeaDto } from './dto/score-product-idea.dto';
import { ModerateProductIdeaDto } from './dto/moderate-product-idea.dto';
import { MergeProductIdeaDto } from './dto/merge-product-idea.dto';
import { UpdateRoadmapDto } from './dto/update-roadmap.dto';
import { QueryProductIdeasDto } from './dto/query-product-ideas.dto';
import { ClientContactUser } from '../client-portal/client-portal.service';

@Injectable()
export class ProductIdeasService {
  constructor(private readonly db: DatabaseService) {}

  // ==========================================
  // 1. Code Generator & Score Calculation
  // ==========================================

  private async generateIdeaCode(): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `IDEA-${year}-%`;

    const res = await this.db.query(
      `SELECT idea_code FROM product_ideas WHERE idea_code LIKE $1 ORDER BY idea_code DESC LIMIT 1`,
      [pattern],
    );

    let nextNum = 1;
    if (res.rowCount && res.rowCount > 0) {
      const match = res.rows[0].idea_code.match(new RegExp(`IDEA-${year}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `IDEA-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  private calculateRiceScore(
    reach: number = 0,
    impact: number = 1.0,
    confidence: number = 1.0,
    effort: number = 1.0,
  ): number {
    const eff = effort <= 0 ? 1.0 : effort;
    return parseFloat(((reach * impact * confidence) / eff).toFixed(2));
  }

  // ==========================================
  // 2. Internal Product Manager CRUD & Scoring
  // ==========================================

  async createIdea(dto: CreateProductIdeaDto, user: { userId: string }) {
    const ideaCode = await this.generateIdeaCode();
    const reach = dto.reach ?? 0;
    const impact = dto.impactScore ?? 1.0;
    const confidence = dto.confidenceScore ?? 1.0;
    const effort = dto.effortScore ?? 1.0;
    const riceScore = this.calculateRiceScore(reach, impact, confidence, effort);

    const query = `
      INSERT INTO product_ideas (
        idea_code, product_id, title, sanitized_description, customer_problem,
        expected_outcome, module_or_component_id, target_segment, status,
        status_reason, roadmap_bucket, indicative_target,
        reach, impact_score, confidence_score, effort_score, strategic_fit, rice_score, scoring_rationale,
        is_published, published_at, moderated_by_user_id, visibility,
        submitted_by_client_id, submitted_by_contact_id, submitted_by_user_id,
        private_evidence_notes, internal_commercial_impact,
        target_version_id, delivery_task_id, changelog_summary,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25, $26,
        $27, $28,
        $29, $30, $31,
        $32, $32
      )
      RETURNING *;
    `;

    const values = [
      ideaCode,
      dto.productId,
      dto.title,
      dto.sanitizedDescription,
      dto.customerProblem || null,
      dto.expectedOutcome || null,
      dto.moduleOrComponentId || null,
      dto.targetSegment || null,
      dto.status || ProductIdeaStatus.PROPOSED,
      dto.statusReason || null,
      dto.roadmapBucket || null,
      dto.indicativeTarget || null,
      reach,
      impact,
      confidence,
      effort,
      dto.strategicFit ?? 3,
      riceScore,
      dto.scoringRationale || null,
      dto.isPublished ?? false,
      dto.isPublished ? new Date() : null,
      dto.isPublished ? user.userId : null,
      dto.visibility || ProductIdeaVisibility.PRODUCT_COMMUNITY,
      dto.submittedByClientId || null,
      dto.submittedByContactId || null,
      dto.submittedByUserId || user.userId,
      dto.privateEvidenceNotes || null,
      dto.internalCommercialImpact || null,
      dto.targetVersionId || null,
      dto.deliveryTaskId || null,
      dto.changelogSummary || null,
      user.userId,
    ];

    const res = await this.db.query(query, values);
    return res.rows[0];
  }

  async updateIdea(id: string, dto: UpdateProductIdeaDto, user: { userId: string }) {
    const existing = await this.getIdeaById(id);

    const reach = dto.reach ?? existing.reach;
    const impact = dto.impactScore ?? parseFloat(existing.impact_score);
    const confidence = dto.confidenceScore ?? parseFloat(existing.confidence_score);
    const effort = dto.effortScore ?? parseFloat(existing.effort_score);
    const riceScore = this.calculateRiceScore(reach, impact, confidence, effort);

    const query = `
      UPDATE product_ideas SET
        title = COALESCE($1, title),
        sanitized_description = COALESCE($2, sanitized_description),
        customer_problem = COALESCE($3, customer_problem),
        expected_outcome = COALESCE($4, expected_outcome),
        module_or_component_id = COALESCE($5, module_or_component_id),
        target_segment = COALESCE($6, target_segment),
        status = COALESCE($7, status),
        status_reason = COALESCE($8, status_reason),
        roadmap_bucket = COALESCE($9, roadmap_bucket),
        indicative_target = COALESCE($10, indicative_target),
        reach = $11,
        impact_score = $12,
        confidence_score = $13,
        effort_score = $14,
        strategic_fit = COALESCE($15, strategic_fit),
        rice_score = $16,
        scoring_rationale = COALESCE($17, scoring_rationale),
        is_published = COALESCE($18, is_published),
        visibility = COALESCE($19, visibility),
        private_evidence_notes = COALESCE($20, private_evidence_notes),
        internal_commercial_impact = COALESCE($21, internal_commercial_impact),
        target_version_id = COALESCE($22, target_version_id),
        delivery_task_id = COALESCE($23, delivery_task_id),
        changelog_summary = COALESCE($24, changelog_summary),
        updated_by = $25,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $26
      RETURNING *;
    `;

    const values = [
      dto.title ?? null,
      dto.sanitizedDescription ?? null,
      dto.customerProblem ?? null,
      dto.expectedOutcome ?? null,
      dto.moduleOrComponentId ?? null,
      dto.targetSegment ?? null,
      dto.status ?? null,
      dto.statusReason ?? null,
      dto.roadmapBucket ?? null,
      dto.indicativeTarget ?? null,
      reach,
      impact,
      confidence,
      effort,
      dto.strategicFit ?? null,
      riceScore,
      dto.scoringRationale ?? null,
      dto.isPublished !== undefined ? dto.isPublished : null,
      dto.visibility ?? null,
      dto.privateEvidenceNotes ?? null,
      dto.internalCommercialImpact ?? null,
      dto.targetVersionId ?? null,
      dto.deliveryTaskId ?? null,
      dto.changelogSummary ?? null,
      user.userId,
      id,
    ];

    const res = await this.db.query(query, values);
    return res.rows[0];
  }

  async scoreIdea(id: string, dto: ScoreProductIdeaDto, user: { userId: string }) {
    const riceScore = this.calculateRiceScore(
      dto.reach,
      dto.impactScore,
      dto.confidenceScore,
      dto.effortScore,
    );

    const res = await this.db.query(
      `UPDATE product_ideas SET
         reach = $1,
         impact_score = $2,
         confidence_score = $3,
         effort_score = $4,
         strategic_fit = COALESCE($5, strategic_fit),
         rice_score = $6,
         scoring_rationale = COALESCE($7, scoring_rationale),
         updated_by = $8,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND is_active = TRUE
       RETURNING *;`,
      [
        dto.reach,
        dto.impactScore,
        dto.confidenceScore,
        dto.effortScore,
        dto.strategicFit || null,
        riceScore,
        dto.scoringRationale || null,
        user.userId,
        id,
      ],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Product idea with ID ${id} not found`);
    }

    return res.rows[0];
  }

  async moderateIdea(id: string, dto: ModerateProductIdeaDto, user: { userId: string }) {
    const existing = await this.getIdeaById(id);

    const publishedAt = dto.isPublished
      ? existing.published_at || new Date()
      : null;

    const res = await this.db.query(
      `UPDATE product_ideas SET
         is_published = $1,
         published_at = $2,
         moderated_by_user_id = $3,
         sanitized_description = COALESCE($4, sanitized_description),
         visibility = COALESCE($5, visibility),
         status = COALESCE($6, status),
         roadmap_bucket = COALESCE($7, roadmap_bucket),
         indicative_target = COALESCE($8, indicative_target),
         status_reason = COALESCE($9, status_reason),
         updated_by = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND is_active = TRUE
       RETURNING *;`,
      [
        dto.isPublished,
        publishedAt,
        user.userId,
        dto.sanitizedDescription || null,
        dto.visibility || null,
        dto.status || null,
        dto.roadmapBucket || null,
        dto.indicativeTarget || null,
        dto.statusReason || null,
        id,
      ],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Product idea with ID ${id} not found`);
    }

    return res.rows[0];
  }

  async updateRoadmap(id: string, dto: UpdateRoadmapDto, user: { userId: string }) {
    // Explicit requirement: "Dated targets are explicitly indicative unless approved as commitments. Target changes preserve history and do not silently change contractual dates."
    const res = await this.db.query(
      `UPDATE product_ideas SET
         roadmap_bucket = $1,
         indicative_target = COALESCE($2, indicative_target),
         status = COALESCE($3, status),
         target_version_id = COALESCE($4, target_version_id),
         delivery_task_id = COALESCE($5, delivery_task_id),
         changelog_summary = COALESCE($6, changelog_summary),
         updated_by = $7,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND is_active = TRUE
       RETURNING *;`,
      [
        dto.roadmapBucket,
        dto.indicativeTarget || null,
        dto.status || null,
        dto.targetVersionId || null,
        dto.deliveryTaskId || null,
        dto.changelogSummary || null,
        user.userId,
        id,
      ],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Product idea with ID ${id} not found`);
    }

    return res.rows[0];
  }

  // ==========================================
  // 3. Duplicate Merging & Atomic Vote Deduplication
  // ==========================================

  async mergeDuplicateIdea(sourceIdeaId: string, dto: MergeProductIdeaDto, user: { userId: string }) {
    if (sourceIdeaId === dto.canonicalIdeaId) {
      throw new BadRequestException('Cannot merge an idea into itself');
    }

    const sourceIdea = await this.getIdeaById(sourceIdeaId);
    const canonicalIdea = await this.getIdeaById(dto.canonicalIdeaId);

    if (sourceIdea.product_id !== canonicalIdea.product_id) {
      throw new BadRequestException('Can only merge ideas belonging to the same product');
    }

    if (sourceIdea.status === ProductIdeaStatus.MERGED) {
      throw new BadRequestException('This idea has already been merged into another idea');
    }

    // Requirements acceptance test:
    // "Acceptance: duplicate merging counts each organization once without revealing private submissions;
    // target changes preserve history and do not silently change contractual dates."

    // 1. Get all votes for source idea
    const sourceVotesRes = await this.db.query(
      `SELECT * FROM product_idea_votes WHERE idea_id = $1 AND is_active = TRUE`,
      [sourceIdeaId],
    );

    let migratedVotesCount = 0;
    let deduplicatedVotesCount = 0;

    for (const vote of sourceVotesRes.rows) {
      // Check if client_id already voted on canonicalIdea
      const existingCanonicalVote = await this.db.query(
        `SELECT id FROM product_idea_votes WHERE idea_id = $1 AND client_id = $2`,
        [dto.canonicalIdeaId, vote.client_id],
      );

      if (existingCanonicalVote.rowCount && existingCanonicalVote.rowCount > 0) {
        // Duplicate vote from same organization! Deduplicate without error.
        deduplicatedVotesCount++;
      } else {
        // Migrate vote to canonical idea
        await this.db.query(
          `INSERT INTO product_idea_votes (
             idea_id, client_id, voted_by_contact_id, voted_by_user_id,
             vote_revision, original_idea_id, is_active
           ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           ON CONFLICT (idea_id, client_id) DO NOTHING;`,
          [
            dto.canonicalIdeaId,
            vote.client_id,
            vote.voted_by_contact_id,
            vote.voted_by_user_id,
            vote.vote_revision,
            sourceIdeaId,
          ],
        );
        migratedVotesCount++;
      }
    }

    // 2. Mark source idea as MERGED
    await this.db.query(
      `UPDATE product_ideas SET
         status = 'MERGED',
         merged_into_idea_id = $1,
         merged_at = CURRENT_TIMESTAMP,
         merged_by_user_id = $2,
         status_reason = $3,
         updated_by = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        dto.canonicalIdeaId,
        user.userId,
        dto.mergeNotes || `Merged into ${canonicalIdea.idea_code}`,
        sourceIdeaId,
      ],
    );

    // 3. Recalculate canonical idea vote count
    const voteCountRes = await this.db.query(
      `SELECT COUNT(*)::int AS cnt FROM product_idea_votes WHERE idea_id = $1 AND is_active = TRUE`,
      [dto.canonicalIdeaId],
    );
    const newCanonicalVoteCount = voteCountRes.rows[0].cnt;

    await this.db.query(
      `UPDATE product_ideas SET vote_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newCanonicalVoteCount, dto.canonicalIdeaId],
    );

    // 4. Record Merge History
    await this.db.query(
      `INSERT INTO product_idea_merge_history (
         canonical_idea_id, merged_idea_id, merged_by_user_id,
         migrated_votes_count, deduplicated_votes_count, merge_notes
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dto.canonicalIdeaId,
        sourceIdeaId,
        user.userId,
        migratedVotesCount,
        deduplicatedVotesCount,
        dto.mergeNotes || null,
      ],
    );

    return {
      message: `Idea ${sourceIdea.idea_code} merged into ${canonicalIdea.idea_code} successfully`,
      canonicalIdeaId: dto.canonicalIdeaId,
      migratedVotesCount,
      deduplicatedVotesCount,
      totalCanonicalVotes: newCanonicalVoteCount,
    };
  }

  // ==========================================
  // 4. Internal Listings & Details
  // ==========================================

  async getIdeas(query: QueryProductIdeasDto) {
    const conditions: string[] = ['pi.is_active = TRUE'];
    const values: any[] = [];
    let pIdx = 1;

    if (query.productId) {
      conditions.push(`pi.product_id = $${pIdx++}`);
      values.push(query.productId);
    }
    if (query.status) {
      conditions.push(`pi.status = $${pIdx++}`);
      values.push(query.status);
    }
    if (query.roadmapBucket) {
      conditions.push(`pi.roadmap_bucket = $${pIdx++}`);
      values.push(query.roadmapBucket);
    }
    if (query.isPublished !== undefined) {
      conditions.push(`pi.is_published = $${pIdx++}`);
      values.push(query.isPublished);
    }
    if (query.search) {
      conditions.push(
        `(pi.title ILIKE $${pIdx} OR pi.idea_code ILIKE $${pIdx} OR pi.sanitized_description ILIKE $${pIdx})`,
      );
      values.push(`%${query.search}%`);
      pIdx++;
    }

    let orderBy = 'pi.created_at DESC';
    if (query.sortBy === 'rice') orderBy = 'pi.rice_score DESC, pi.created_at DESC';
    else if (query.sortBy === 'votes') orderBy = 'pi.vote_count DESC, pi.created_at DESC';

    const sql = `
      SELECT pi.*,
             pr.product_name, pr.product_code,
             sc.component_name, sc.component_code,
             c.company_name AS submitted_by_client_name,
             CONCAT(cc.first_name, ' ', cc.last_name) AS submitted_by_contact_name,
             CONCAT(mod_u.first_name, ' ', mod_u.last_name) AS moderated_by_name,
             v.version_name AS target_version_name,
             t.task_code AS delivery_task_code, t.title AS delivery_task_title,
             canon.idea_code AS merged_into_code, canon.title AS merged_into_title
      FROM product_ideas pi
      INNER JOIN products pr ON pi.product_id = pr.id
      LEFT JOIN software_components sc ON pi.module_or_component_id = sc.id
      LEFT JOIN clients c ON pi.submitted_by_client_id = c.id
      LEFT JOIN client_contacts cc ON pi.submitted_by_contact_id = cc.id
      LEFT JOIN users mod_u ON pi.moderated_by_user_id = mod_u.id
      LEFT JOIN versions v ON pi.target_version_id = v.id
      LEFT JOIN tasks t ON pi.delivery_task_id = t.id
      LEFT JOIN product_ideas canon ON pi.merged_into_idea_id = canon.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy};
    `;

    const res = await this.db.query(sql, values);
    return res.rows;
  }

  async getIdeaById(id: string) {
    const sql = `
      SELECT pi.*,
             pr.product_name, pr.product_code,
             sc.component_name, sc.component_code,
             c.company_name AS submitted_by_client_name,
             CONCAT(cc.first_name, ' ', cc.last_name) AS submitted_by_contact_name,
             CONCAT(mod_u.first_name, ' ', mod_u.last_name) AS moderated_by_name,
             v.version_name AS target_version_name,
             t.task_code AS delivery_task_code, t.title AS delivery_task_title,
             canon.idea_code AS merged_into_code, canon.title AS merged_into_title
      FROM product_ideas pi
      INNER JOIN products pr ON pi.product_id = pr.id
      LEFT JOIN software_components sc ON pi.module_or_component_id = sc.id
      LEFT JOIN clients c ON pi.submitted_by_client_id = c.id
      LEFT JOIN client_contacts cc ON pi.submitted_by_contact_id = cc.id
      LEFT JOIN users mod_u ON pi.moderated_by_user_id = mod_u.id
      LEFT JOIN versions v ON pi.target_version_id = v.id
      LEFT JOIN tasks t ON pi.delivery_task_id = t.id
      LEFT JOIN product_ideas canon ON pi.merged_into_idea_id = canon.id
      WHERE pi.id = $1 AND pi.is_active = TRUE;
    `;

    const res = await this.db.query(sql, [id]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Product idea with ID ${id} not found`);
    }

    const idea = res.rows[0];

    // Merged sources history
    const mergeHistoryRes = await this.db.query(
      `SELECT mh.*,
              mi.idea_code AS merged_idea_code, mi.title AS merged_idea_title,
              CONCAT(u.first_name, ' ', u.last_name) AS merged_by_name
       FROM product_idea_merge_history mh
       INNER JOIN product_ideas mi ON mh.merged_idea_id = mi.id
       LEFT JOIN users u ON mh.merged_by_user_id = u.id
       WHERE mh.canonical_idea_id = $1
       ORDER BY mh.created_at DESC;`,
      [id],
    );
    idea.merge_sources = mergeHistoryRes.rows;

    return idea;
  }

  // ==========================================
  // 5. Customer Portal: Zero Confidentiality Leakage & Voting
  // ==========================================

  private async getLicensedProductIds(clientId: string): Promise<string[]> {
    const res = await this.db.query(
      `SELECT product_id FROM product_client_mappings WHERE client_id = $1 AND is_active = TRUE`,
      [clientId],
    );
    return res.rows.map((r) => r.product_id);
  }

  async getClientPortalIdeas(
    contact: ClientContactUser,
    productId?: string,
    search?: string,
    roadmapBucket?: string,
  ) {
    const licensedProductIds = await this.getLicensedProductIds(contact.clientId);
    if (licensedProductIds.length === 0) {
      return [];
    }

    const conditions: string[] = [
      'pi.is_active = TRUE',
      'pi.is_published = TRUE',
      "pi.visibility IN ('PRODUCT_COMMUNITY', 'PUBLIC')",
      `pi.product_id = ANY($1::uuid[])`,
    ];
    const values: any[] = [licensedProductIds];
    let pIdx = 2;

    if (productId) {
      conditions.push(`pi.product_id = $${pIdx++}`);
      values.push(productId);
    }
    if (roadmapBucket) {
      conditions.push(`pi.roadmap_bucket = $${pIdx++}`);
      values.push(roadmapBucket);
    }
    if (search) {
      conditions.push(`(pi.title ILIKE $${pIdx} OR pi.sanitized_description ILIKE $${pIdx})`);
      values.push(`%${search}%`);
      pIdx++;
    }

    // Zero confidentiality leakage:
    // Strictly omit: reach, impact_score, confidence_score, effort_score, rice_score,
    // scoring_rationale, submitted_by_client_id, private_evidence_notes, internal_commercial_impact.
    // Also include has_client_voted for caller's organization.
    const sql = `
      SELECT pi.id, pi.idea_code, pi.product_id, pr.product_name, pr.product_code,
             pi.title, pi.sanitized_description, pi.expected_outcome,
             pi.target_segment, pi.status, pi.status_reason,
             pi.roadmap_bucket, pi.indicative_target,
             pi.changelog_summary, pi.vote_count, pi.follower_count,
             v.version_name AS target_version_name,
             pi.published_at,
             EXISTS(
               SELECT 1 FROM product_idea_votes piv
               WHERE piv.idea_id = pi.id AND piv.client_id = $${pIdx} AND piv.is_active = TRUE
             ) AS has_client_voted,
             EXISTS(
               SELECT 1 FROM product_idea_follows pif
               WHERE pif.idea_id = pi.id AND pif.contact_id = $${pIdx + 1}
             ) AS is_following
      FROM product_ideas pi
      INNER JOIN products pr ON pi.product_id = pr.id
      LEFT JOIN versions v ON pi.target_version_id = v.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pi.vote_count DESC, pi.created_at DESC;
    `;
    values.push(contact.clientId, contact.contactId);

    const res = await this.db.query(sql, values);
    return res.rows;
  }

  async getClientPortalIdeaDetail(id: string, contact: ClientContactUser) {
    const licensedProductIds = await this.getLicensedProductIds(contact.clientId);

    const sql = `
      SELECT pi.id, pi.idea_code, pi.product_id, pr.product_name, pr.product_code,
             pi.title, pi.sanitized_description, pi.expected_outcome,
             pi.target_segment, pi.status, pi.status_reason,
             pi.roadmap_bucket, pi.indicative_target,
             pi.changelog_summary, pi.vote_count, pi.follower_count,
             v.version_name AS target_version_name,
             pi.published_at,
             EXISTS(
               SELECT 1 FROM product_idea_votes piv
               WHERE piv.idea_id = pi.id AND piv.client_id = $1 AND piv.is_active = TRUE
             ) AS has_client_voted,
             EXISTS(
               SELECT 1 FROM product_idea_follows pif
               WHERE pif.idea_id = pi.id AND pif.contact_id = $2
             ) AS is_following
      FROM product_ideas pi
      INNER JOIN products pr ON pi.product_id = pr.id
      LEFT JOIN versions v ON pi.target_version_id = v.id
      WHERE pi.id = $3 AND pi.is_active = TRUE AND pi.is_published = TRUE
        AND pi.product_id = ANY($4::uuid[]);
    `;

    const res = await this.db.query(sql, [contact.clientId, contact.contactId, id, licensedProductIds]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Idea not found or not published for your licensed products`);
    }

    return res.rows[0];
  }

  async clientSubmitIdea(
    dto: { productId: string; title: string; customerProblem: string; expectedOutcome?: string },
    contact: ClientContactUser,
  ) {
    const licensed = await this.getLicensedProductIds(contact.clientId);
    if (!licensed.includes(dto.productId)) {
      throw new ForbiddenException('Your organization is not licensed for this product');
    }

    const ideaCode = await this.generateIdeaCode();

    const query = `
      INSERT INTO product_ideas (
        idea_code, product_id, title, sanitized_description, customer_problem,
        expected_outcome, status, is_published, visibility,
        submitted_by_client_id, submitted_by_contact_id,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, 'PROPOSED', FALSE, 'PRODUCT_COMMUNITY',
        $7, $8,
        $9, $9
      )
      RETURNING id, idea_code, title, status, created_at;
    `;

    const res = await this.db.query(query, [
      ideaCode,
      dto.productId,
      dto.title,
      dto.customerProblem,
      dto.customerProblem,
      dto.expectedOutcome || null,
      contact.clientId,
      contact.contactId,
      contact.id,
    ]);

    return {
      message: 'Feedback idea submitted for product manager review and moderation',
      idea: res.rows[0],
    };
  }

  async toggleOrganizationVote(ideaId: string, contact: ClientContactUser) {
    // 1. Verify idea is published and in a votable state
    const idea = await this.getClientPortalIdeaDetail(ideaId, contact);
    if (idea.status === 'DECLINED' || idea.status === 'MERGED') {
      throw new BadRequestException(`Cannot vote on ideas with status '${idea.status}'`);
    }

    // 2. Check existing vote for caller's organization (Atomic One Vote Per Organization)
    const voteRes = await this.db.query(
      `SELECT id, is_active FROM product_idea_votes WHERE idea_id = $1 AND client_id = $2`,
      [ideaId, contact.clientId],
    );

    let hasVoted = false;
    if (voteRes.rowCount && voteRes.rowCount > 0) {
      const vote = voteRes.rows[0];
      if (vote.is_active) {
        // Retract vote
        await this.db.query(
          `UPDATE product_idea_votes SET
             is_active = FALSE,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [vote.id],
        );
        hasVoted = false;
      } else {
        // Re-cast vote
        await this.db.query(
          `UPDATE product_idea_votes SET
             is_active = TRUE,
             vote_revision = vote_revision + 1,
             voted_by_contact_id = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [contact.contactId, vote.id],
        );
        hasVoted = true;
      }
    } else {
      // Cast new vote
      await this.db.query(
        `INSERT INTO product_idea_votes (idea_id, client_id, voted_by_contact_id, is_active)
         VALUES ($1, $2, $3, TRUE);`,
        [ideaId, contact.clientId, contact.contactId],
      );
      hasVoted = true;
    }

    // 3. Atomically update vote count
    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS cnt FROM product_idea_votes WHERE idea_id = $1 AND is_active = TRUE`,
      [ideaId],
    );
    const voteCount = countRes.rows[0].cnt;

    await this.db.query(
      `UPDATE product_ideas SET vote_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [voteCount, ideaId],
    );

    return {
      message: hasVoted
        ? 'Your organization vote has been recorded'
        : 'Your organization vote has been retracted',
      hasVoted,
      voteCount,
    };
  }

  async toggleIdeaFollow(ideaId: string, contact: ClientContactUser) {
    await this.getClientPortalIdeaDetail(ideaId, contact);

    const check = await this.db.query(
      `SELECT id FROM product_idea_follows WHERE idea_id = $1 AND contact_id = $2`,
      [ideaId, contact.contactId],
    );

    let isFollowing = false;
    if (check.rowCount && check.rowCount > 0) {
      await this.db.query(`DELETE FROM product_idea_follows WHERE id = $1`, [check.rows[0].id]);
      isFollowing = false;
    } else {
      await this.db.query(
        `INSERT INTO product_idea_follows (idea_id, contact_id) VALUES ($1, $2);`,
        [ideaId, contact.contactId],
      );
      isFollowing = true;
    }

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS cnt FROM product_idea_follows WHERE idea_id = $1`,
      [ideaId],
    );
    const followerCount = countRes.rows[0].cnt;

    await this.db.query(
      `UPDATE product_ideas SET follower_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [followerCount, ideaId],
    );

    return {
      message: isFollowing ? 'Now following this idea' : 'Unfollowed idea',
      isFollowing,
      followerCount,
    };
  }

  async getClientPortalRoadmap(contact: ClientContactUser, productId?: string) {
    const ideas = await this.getClientPortalIdeas(contact, productId, undefined, undefined);

    const now = ideas.filter((i) => i.roadmap_bucket === 'NOW');
    const next = ideas.filter((i) => i.roadmap_bucket === 'NEXT');
    const later = ideas.filter((i) => i.roadmap_bucket === 'LATER');

    return {
      now,
      next,
      later,
    };
  }
}
