import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateProductGoalDto,
  ProductGoalStatus,
} from './dto/create-product-goal.dto';
import { UpdateProductGoalDto } from './dto/update-product-goal.dto';
import {
  CreateOutcomeReviewDto,
} from './dto/create-outcome-review.dto';
import {
  QueryProductGoalsDto,
  QueryOutcomeReviewsDto,
} from './dto/query-product-goals.dto';

@Injectable()
export class ProductGoalsService {
  constructor(private readonly db: DatabaseService) {}

  // ==========================================
  // 1. Code Generators
  // ==========================================

  private async generateGoalCode(): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `GOAL-${year}-%`;

    const res = await this.db.query(
      `SELECT goal_code FROM product_goals WHERE goal_code LIKE $1 ORDER BY goal_code DESC LIMIT 1`,
      [pattern],
    );

    let nextNum = 1;
    if (res.rowCount && res.rowCount > 0) {
      const match = res.rows[0].goal_code.match(new RegExp(`GOAL-${year}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `GOAL-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  private async generateReviewCode(): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `REV-${year}-%`;

    const res = await this.db.query(
      `SELECT review_code FROM product_outcome_reviews WHERE review_code LIKE $1 ORDER BY review_code DESC LIMIT 1`,
      [pattern],
    );

    let nextNum = 1;
    if (res.rowCount && res.rowCount > 0) {
      const match = res.rows[0].review_code.match(new RegExp(`REV-${year}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `REV-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  private calculateProgress(
    baseline: number,
    target: number,
    current: number,
  ): number {
    if (target === baseline) {
      return current >= target ? 100 : 0;
    }
    if (target > baseline) {
      const pct = ((current - baseline) / (target - baseline)) * 100;
      return Math.round(Math.max(0, Math.min(100, pct)) * 10) / 10;
    } else {
      // Inverted metric (lower is better, e.g. latency)
      const pct = ((baseline - current) / (baseline - target)) * 100;
      return Math.round(Math.max(0, Math.min(100, pct)) * 10) / 10;
    }
  }

  // ==========================================
  // 2. Product Goals CRUD
  // ==========================================

  async createGoal(dto: CreateProductGoalDto, user: any) {
    const prodRes = await this.db.query(
      `SELECT id, product_name FROM products WHERE id = $1 AND is_active = TRUE`,
      [dto.product_id],
    );
    if (!prodRes.rowCount || prodRes.rowCount === 0) {
      throw new NotFoundException(`Product with ID ${dto.product_id} not found`);
    }

    const goalCode = await this.generateGoalCode();
    const currentValue = dto.current_value !== undefined ? dto.current_value : dto.baseline_value;
    const status = dto.status || ProductGoalStatus.IN_PROGRESS;
    const userId = user.userId || user.id;

    const res = await this.db.query(
      `INSERT INTO product_goals (
        goal_code, product_id, title, description, category,
        metric_name, metric_unit, baseline_value, target_value,
        current_value, target_date, owner_user_id, status,
        is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14, $14)
      RETURNING *`,
      [
        goalCode,
        dto.product_id,
        dto.title,
        dto.description || null,
        dto.category,
        dto.metric_name,
        dto.metric_unit,
        dto.baseline_value,
        dto.target_value,
        currentValue,
        dto.target_date,
        dto.owner_user_id || null,
        status,
        userId,
      ],
    );

    const goal = res.rows[0];
    goal.progress_percentage = this.calculateProgress(
      parseFloat(goal.baseline_value),
      parseFloat(goal.target_value),
      parseFloat(goal.current_value),
    );
    return goal;
  }

  async getGoals(query: QueryProductGoalsDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['pg.is_active = TRUE'];
    const params: any[] = [];
    let pIdx = 1;

    if (query.product_id) {
      conditions.push(`pg.product_id = $${pIdx++}`);
      params.push(query.product_id);
    }
    if (query.status) {
      conditions.push(`pg.status = $${pIdx++}`);
      params.push(query.status);
    }
    if (query.category) {
      conditions.push(`pg.category = $${pIdx++}`);
      params.push(query.category);
    }
    if (query.search) {
      conditions.push(
        `(pg.title ILIKE $${pIdx} OR pg.metric_name ILIKE $${pIdx} OR pg.goal_code ILIKE $${pIdx})`,
      );
      params.push(`%${query.search}%`);
      pIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM product_goals pg ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const sql = `
      SELECT
        pg.*,
        p.product_name,
        p.product_code,
        u.display_name AS owner_name,
        u.email AS owner_email,
        (
          SELECT COUNT(*)::int 
          FROM product_outcome_reviews por 
          WHERE por.goal_id = pg.id AND por.is_active = TRUE
        ) AS reviews_count,
        (
          SELECT json_build_object(
            'review_code', por.review_code,
            'review_date', por.review_date,
            'outcome_verdict', por.outcome_verdict,
            'actual_metric_value', por.actual_metric_value
          )
          FROM product_outcome_reviews por
          WHERE por.goal_id = pg.id AND por.is_active = TRUE
          ORDER BY por.review_date DESC, por.created_at DESC
          LIMIT 1
        ) AS latest_review
      FROM product_goals pg
      JOIN products p ON pg.product_id = p.id
      LEFT JOIN users u ON pg.owner_user_id = u.id
      ${whereClause}
      ORDER BY pg.target_date ASC, pg.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    params.push(limit, offset);
    const res = await this.db.query(sql, params);

    const data = res.rows.map((row) => ({
      ...row,
      progress_percentage: this.calculateProgress(
        parseFloat(row.baseline_value),
        parseFloat(row.target_value),
        parseFloat(row.current_value),
      ),
    }));

    return {
      items: data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getGoalById(id: string) {
    const res = await this.db.query(
      `SELECT
        pg.*,
        p.product_name,
        p.product_code,
        u.display_name AS owner_name,
        u.email AS owner_email
      FROM product_goals pg
      JOIN products p ON pg.product_id = p.id
      LEFT JOIN users u ON pg.owner_user_id = u.id
      WHERE pg.id = $1 AND pg.is_active = TRUE`,
      [id],
    );

    if (!res.rowCount || res.rowCount === 0) {
      throw new NotFoundException(`Product goal with ID ${id} not found`);
    }

    const goal = res.rows[0];
    goal.progress_percentage = this.calculateProgress(
      parseFloat(goal.baseline_value),
      parseFloat(goal.target_value),
      parseFloat(goal.current_value),
    );

    // Fetch linked outcome reviews
    const reviewsRes = await this.db.query(
      `SELECT
        por.*,
        v.version_code,
        v.version_name,
        pi.idea_code,
        pi.title AS idea_title,
        u.display_name AS reviewer_name,
        u.email AS reviewer_email
      FROM product_outcome_reviews por
      LEFT JOIN versions v ON por.version_id = v.id
      LEFT JOIN product_ideas pi ON por.idea_id = pi.id
      LEFT JOIN users u ON por.reviewer_user_id = u.id
      WHERE por.goal_id = $1 AND por.is_active = TRUE
      ORDER BY por.review_date DESC, por.created_at DESC`,
      [id],
    );

    goal.outcome_reviews = reviewsRes.rows;
    return goal;
  }

  async updateGoal(id: string, dto: UpdateProductGoalDto, user: any) {
    const existing = await this.getGoalById(id);
    const userId = user.userId || user.id;

    const updates: string[] = ['updated_by = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [userId];
    let pIdx = 2;

    if (dto.title !== undefined) {
      updates.push(`title = $${pIdx++}`);
      params.push(dto.title);
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${pIdx++}`);
      params.push(dto.description);
    }
    if (dto.category !== undefined) {
      updates.push(`category = $${pIdx++}`);
      params.push(dto.category);
    }
    if (dto.metric_name !== undefined) {
      updates.push(`metric_name = $${pIdx++}`);
      params.push(dto.metric_name);
    }
    if (dto.metric_unit !== undefined) {
      updates.push(`metric_unit = $${pIdx++}`);
      params.push(dto.metric_unit);
    }
    if (dto.baseline_value !== undefined) {
      updates.push(`baseline_value = $${pIdx++}`);
      params.push(dto.baseline_value);
    }
    if (dto.target_value !== undefined) {
      updates.push(`target_value = $${pIdx++}`);
      params.push(dto.target_value);
    }
    if (dto.current_value !== undefined) {
      updates.push(`current_value = $${pIdx++}`);
      params.push(dto.current_value);
    }
    if (dto.target_date !== undefined) {
      updates.push(`target_date = $${pIdx++}`);
      params.push(dto.target_date);
    }
    if (dto.owner_user_id !== undefined) {
      updates.push(`owner_user_id = $${pIdx++}`);
      params.push(dto.owner_user_id || null);
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${pIdx++}`);
      params.push(dto.status);
    }

    params.push(id);
    const updateSql = `
      UPDATE product_goals
      SET ${updates.join(', ')}
      WHERE id = $${pIdx} AND is_active = TRUE
      RETURNING *
    `;

    const res = await this.db.query(updateSql, params);
    const updated = res.rows[0];
    updated.progress_percentage = this.calculateProgress(
      parseFloat(updated.baseline_value),
      parseFloat(updated.target_value),
      parseFloat(updated.current_value),
    );
    return updated;
  }

  async updateGoalProgress(
    id: string,
    currentValue: number,
    status?: ProductGoalStatus,
    user?: any,
  ) {
    const existing = await this.getGoalById(id);
    const userId = user?.userId || user?.id || null;

    let targetStatus = status || existing.status;
    // Auto-mark achieved if reached target
    const targetVal = parseFloat(existing.target_value);
    const baselineVal = parseFloat(existing.baseline_value);
    if (!status) {
      if (targetVal > baselineVal && currentValue >= targetVal) {
        targetStatus = ProductGoalStatus.ACHIEVED;
      } else if (targetVal < baselineVal && currentValue <= targetVal) {
        targetStatus = ProductGoalStatus.ACHIEVED;
      }
    }

    const res = await this.db.query(
      `UPDATE product_goals
      SET current_value = $1, status = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND is_active = TRUE
      RETURNING *`,
      [currentValue, targetStatus, userId, id],
    );

    const goal = res.rows[0];
    goal.progress_percentage = this.calculateProgress(
      parseFloat(goal.baseline_value),
      parseFloat(goal.target_value),
      parseFloat(goal.current_value),
    );
    return goal;
  }

  async deleteGoal(id: string, user: any) {
    await this.getGoalById(id);
    const userId = user.userId || user.id;

    await this.db.query(
      `UPDATE product_goals
      SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [userId, id],
    );
    return { success: true, message: `Product goal ${id} archived` };
  }

  // ==========================================
  // 3. Post-Release Outcome Evaluation Reviews
  // ==========================================

  async createOutcomeReview(dto: CreateOutcomeReviewDto, user: any) {
    const prodRes = await this.db.query(
      `SELECT id, product_name FROM products WHERE id = $1 AND is_active = TRUE`,
      [dto.product_id],
    );
    if (!prodRes.rowCount || prodRes.rowCount === 0) {
      throw new NotFoundException(`Product with ID ${dto.product_id} not found`);
    }

    if (dto.goal_id) {
      const goalRes = await this.db.query(
        `SELECT id, target_value, baseline_value, status FROM product_goals WHERE id = $1 AND is_active = TRUE`,
        [dto.goal_id],
      );
      if (!goalRes.rowCount || goalRes.rowCount === 0) {
        throw new NotFoundException(`Goal with ID ${dto.goal_id} not found`);
      }
    }

    if (dto.version_id) {
      const verRes = await this.db.query(
        `SELECT id, version_code FROM versions WHERE id = $1 AND is_active = TRUE`,
        [dto.version_id],
      );
      if (!verRes.rowCount || verRes.rowCount === 0) {
        throw new NotFoundException(`Version with ID ${dto.version_id} not found`);
      }
    }

    if (dto.idea_id) {
      const ideaRes = await this.db.query(
        `SELECT id, idea_code FROM product_ideas WHERE id = $1 AND is_active = TRUE`,
        [dto.idea_id],
      );
      if (!ideaRes.rowCount || ideaRes.rowCount === 0) {
        throw new NotFoundException(`Product idea with ID ${dto.idea_id} not found`);
      }
    }

    const reviewCode = await this.generateReviewCode();
    const userId = user.userId || user.id;
    const reviewerId = dto.reviewer_user_id || userId;
    const reconciledAllowance = dto.reconciled_allowance_used !== undefined ? dto.reconciled_allowance_used : 0;

    const res = await this.db.query(
      `INSERT INTO product_outcome_reviews (
        review_code, product_id, goal_id, version_id, idea_id,
        review_title, review_date, reviewer_user_id, actual_metric_value,
        outcome_verdict, adoption_observations, customer_evidence,
        feedback_summary, learnings_and_next_steps, reconciled_allowance_used,
        is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE, $16, $16)
      RETURNING *`,
      [
        reviewCode,
        dto.product_id,
        dto.goal_id || null,
        dto.version_id || null,
        dto.idea_id || null,
        dto.review_title,
        dto.review_date,
        reviewerId,
        dto.actual_metric_value !== undefined ? dto.actual_metric_value : null,
        dto.outcome_verdict,
        dto.adoption_observations || null,
        dto.customer_evidence || null,
        dto.feedback_summary || null,
        dto.learnings_and_next_steps || null,
        reconciledAllowance,
        userId,
      ],
    );

    // If goal is linked and actual metric value is provided, sync metric with goal
    if (dto.goal_id && dto.actual_metric_value !== undefined) {
      const isAchieved =
        dto.outcome_verdict === 'EXCEEDED_EXPECTATIONS' ||
        dto.outcome_verdict === 'MET_EXPECTATIONS';

      await this.db.query(
        `UPDATE product_goals
        SET current_value = $1,
            status = CASE WHEN $2 = TRUE THEN 'ACHIEVED' ELSE status END,
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND is_active = TRUE`,
        [dto.actual_metric_value, isAchieved, userId, dto.goal_id],
      );
    }

    return res.rows[0];
  }

  async getOutcomeReviews(query: QueryOutcomeReviewsDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['por.is_active = TRUE'];
    const params: any[] = [];
    let pIdx = 1;

    if (query.product_id) {
      conditions.push(`por.product_id = $${pIdx++}`);
      params.push(query.product_id);
    }
    if (query.goal_id) {
      conditions.push(`por.goal_id = $${pIdx++}`);
      params.push(query.goal_id);
    }
    if (query.version_id) {
      conditions.push(`por.version_id = $${pIdx++}`);
      params.push(query.version_id);
    }
    if (query.idea_id) {
      conditions.push(`por.idea_id = $${pIdx++}`);
      params.push(query.idea_id);
    }
    if (query.verdict) {
      conditions.push(`por.outcome_verdict = $${pIdx++}`);
      params.push(query.verdict);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM product_outcome_reviews por ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const sql = `
      SELECT
        por.*,
        p.product_name,
        p.product_code,
        pg.goal_code,
        pg.title AS goal_title,
        pg.metric_name,
        pg.metric_unit,
        pg.target_value,
        pg.baseline_value,
        v.version_code,
        v.version_name,
        pi.idea_code,
        pi.title AS idea_title,
        u.display_name AS reviewer_name,
        u.email AS reviewer_email
      FROM product_outcome_reviews por
      JOIN products p ON por.product_id = p.id
      LEFT JOIN product_goals pg ON por.goal_id = pg.id
      LEFT JOIN versions v ON por.version_id = v.id
      LEFT JOIN product_ideas pi ON por.idea_id = pi.id
      LEFT JOIN users u ON por.reviewer_user_id = u.id
      ${whereClause}
      ORDER BY por.review_date DESC, por.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    params.push(limit, offset);
    const res = await this.db.query(sql, params);

    return {
      items: res.rows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getOutcomeReviewById(id: string) {
    const res = await this.db.query(
      `SELECT
        por.*,
        p.product_name,
        p.product_code,
        pg.goal_code,
        pg.title AS goal_title,
        pg.metric_name,
        pg.metric_unit,
        pg.target_value,
        pg.baseline_value,
        v.version_code,
        v.version_name,
        pi.idea_code,
        pi.title AS idea_title,
        u.display_name AS reviewer_name,
        u.email AS reviewer_email
      FROM product_outcome_reviews por
      JOIN products p ON por.product_id = p.id
      LEFT JOIN product_goals pg ON por.goal_id = pg.id
      LEFT JOIN versions v ON por.version_id = v.id
      LEFT JOIN product_ideas pi ON por.idea_id = pi.id
      LEFT JOIN users u ON por.reviewer_user_id = u.id
      WHERE por.id = $1 AND por.is_active = TRUE`,
      [id],
    );

    if (!res.rowCount || res.rowCount === 0) {
      throw new NotFoundException(`Outcome review with ID ${id} not found`);
    }

    return res.rows[0];
  }

  // ==========================================
  // 4. Analytics & Dashboard Summary
  // ==========================================

  async getGoalsSummary(productId?: string) {
    const filter = productId ? `AND product_id = $1` : '';
    const params = productId ? [productId] : [];

    const goalsSummarySql = `
      SELECT
        COUNT(*)::int AS total_goals,
        COUNT(CASE WHEN status = 'ACHIEVED' THEN 1 END)::int AS achieved_count,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END)::int AS in_progress_count,
        COUNT(CASE WHEN status = 'MISSED' THEN 1 END)::int AS missed_count,
        COUNT(CASE WHEN status = 'DRAFT' THEN 1 END)::int AS draft_count,
        COUNT(CASE WHEN status = 'ABANDONED' THEN 1 END)::int AS abandoned_count,
        COUNT(CASE WHEN category = 'ADOPTION' THEN 1 END)::int AS adoption_count,
        COUNT(CASE WHEN category = 'PERFORMANCE' THEN 1 END)::int AS performance_count,
        COUNT(CASE WHEN category = 'REVENUE_GROWTH' THEN 1 END)::int AS revenue_count,
        COUNT(CASE WHEN category = 'QUALITY_RELIABILITY' THEN 1 END)::int AS quality_count,
        COUNT(CASE WHEN category = 'USER_SATISFACTION' THEN 1 END)::int AS satisfaction_count
      FROM product_goals
      WHERE is_active = TRUE ${filter}
    `;

    const reviewsSummarySql = `
      SELECT
        COUNT(*)::int AS total_reviews,
        COUNT(CASE WHEN outcome_verdict = 'EXCEEDED_EXPECTATIONS' THEN 1 END)::int AS exceeded_count,
        COUNT(CASE WHEN outcome_verdict = 'MET_EXPECTATIONS' THEN 1 END)::int AS met_count,
        COUNT(CASE WHEN outcome_verdict = 'BELOW_EXPECTATIONS' THEN 1 END)::int AS below_count,
        COUNT(CASE WHEN outcome_verdict = 'INCONCLUSIVE' THEN 1 END)::int AS inconclusive_count,
        COALESCE(SUM(reconciled_allowance_used), 0)::numeric(12, 2) AS total_reconciled_allowance
      FROM product_outcome_reviews
      WHERE is_active = TRUE ${filter}
    `;

    const [goalsRes, reviewsRes] = await Promise.all([
      this.db.query(goalsSummarySql, params),
      this.db.query(reviewsSummarySql, params),
    ]);

    return {
      goals: goalsRes.rows[0] || {},
      reviews: reviewsRes.rows[0] || {},
    };
  }
}
