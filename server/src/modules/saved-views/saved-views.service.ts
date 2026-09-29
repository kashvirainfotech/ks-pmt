import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';
import { QuerySavedViewDto } from './dto/query-saved-view.dto';

export interface SavedViewPreset {
  id: string;
  viewName: string;
  entityType: string;
  icon: string;
  color: string;
  filters: Record<string, any>;
  columns?: any[];
  sort?: any[];
  groupBy?: string;
  viewMode: 'LIST' | 'KANBAN' | 'CALENDAR' | 'TIMELINE';
  isPreset: boolean;
  description: string;
}

@Injectable()
export class SavedViewsService {
  private readonly logger = new Logger(SavedViewsService.name);

  constructor(private readonly db: DatabaseService) {}

  async createView(dto: CreateSavedViewDto, userId: string) {
    const entityType = dto.entityType || 'TASK';
    const scope = dto.scope || 'PERSONAL';

    // If default is requested, clear previous default for this user + entityType
    if (dto.isDefault) {
      await this.db.query(
        `UPDATE saved_views 
         SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND entity_type = $2`,
        [userId, entityType],
      );
    }

    const result = await this.db.query(
      `INSERT INTO saved_views (
        view_name, entity_type, scope, project_id, product_id,
        user_id, is_default, is_favorite, icon, color,
        filters, columns, sort, group_by, view_mode,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $6)
      RETURNING *`,
      [
        dto.viewName,
        entityType,
        scope,
        dto.projectId || null,
        dto.productId || null,
        userId,
        dto.isDefault ?? false,
        dto.isFavorite ?? false,
        dto.icon || 'bookmark',
        dto.color || 'blue',
        JSON.stringify(dto.filters || {}),
        JSON.stringify(dto.columns || []),
        JSON.stringify(dto.sort || []),
        dto.groupBy || null,
        dto.viewMode || 'LIST',
      ],
    );

    return result.rows[0];
  }

  async findAllViews(userId: string, query: QuerySavedViewDto) {
    const conditions: string[] = ['sv.is_active = TRUE'];
    const params: any[] = [userId];

    // Visibility: personal views for this user, OR shared project/team/global views
    conditions.push(
      `(sv.user_id = $1 OR sv.scope IN ('TEAM', 'PROJECT', 'GLOBAL'))`,
    );

    if (query.entityType) {
      params.push(query.entityType);
      conditions.push(`sv.entity_type = $${params.length}`);
    }

    if (query.projectId) {
      params.push(query.projectId);
      conditions.push(
        `(sv.project_id = $${params.length} OR sv.project_id IS NULL)`,
      );
    }

    if (query.productId) {
      params.push(query.productId);
      conditions.push(
        `(sv.product_id = $${params.length} OR sv.product_id IS NULL)`,
      );
    }

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      conditions.push(`LOWER(sv.view_name) LIKE $${params.length}`);
    }

    const sql = `
      SELECT sv.*,
             u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
             p.project_name
      FROM saved_views sv
      LEFT JOIN users u ON u.id = sv.user_id
      LEFT JOIN projects p ON p.id = sv.project_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY sv.is_favorite DESC, sv.is_default DESC, sv.view_name ASC
    `;

    const result = await this.db.query(sql, params);
    return result.rows;
  }

  async findOneView(id: string, userId: string) {
    const result = await this.db.query(
      `SELECT sv.*,
              u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
              p.project_name
       FROM saved_views sv
       LEFT JOIN users u ON u.id = sv.user_id
       LEFT JOIN projects p ON p.id = sv.project_id
       WHERE sv.id = $1 AND sv.is_active = TRUE`,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException(`Saved view with ID ${id} not found`);
    }

    const view = result.rows[0];
    if (view.scope === 'PERSONAL' && view.user_id !== userId) {
      throw new ForbiddenException('Access denied to private saved view');
    }

    return view;
  }

  async updateView(id: string, dto: UpdateSavedViewDto, userId: string) {
    const current = await this.findOneView(id, userId);

    if (current.user_id !== userId) {
      throw new ForbiddenException('Only the view owner can modify this saved view');
    }

    if (dto.isDefault) {
      await this.db.query(
        `UPDATE saved_views 
         SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND entity_type = $2 AND id <> $3`,
        [userId, current.entity_type, id],
      );
    }

    const fields: string[] = ['updated_by = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [id, userId];

    if (dto.viewName !== undefined) {
      params.push(dto.viewName);
      fields.push(`view_name = $${params.length}`);
    }
    if (dto.scope !== undefined) {
      params.push(dto.scope);
      fields.push(`scope = $${params.length}`);
    }
    if (dto.projectId !== undefined) {
      params.push(dto.projectId);
      fields.push(`project_id = $${params.length}`);
    }
    if (dto.productId !== undefined) {
      params.push(dto.productId);
      fields.push(`product_id = $${params.length}`);
    }
    if (dto.isDefault !== undefined) {
      params.push(dto.isDefault);
      fields.push(`is_default = $${params.length}`);
    }
    if (dto.isFavorite !== undefined) {
      params.push(dto.isFavorite);
      fields.push(`is_favorite = $${params.length}`);
    }
    if (dto.icon !== undefined) {
      params.push(dto.icon);
      fields.push(`icon = $${params.length}`);
    }
    if (dto.color !== undefined) {
      params.push(dto.color);
      fields.push(`color = $${params.length}`);
    }
    if (dto.filters !== undefined) {
      params.push(JSON.stringify(dto.filters));
      fields.push(`filters = $${params.length}`);
    }
    if (dto.columns !== undefined) {
      params.push(JSON.stringify(dto.columns));
      fields.push(`columns = $${params.length}`);
    }
    if (dto.sort !== undefined) {
      params.push(JSON.stringify(dto.sort));
      fields.push(`sort = $${params.length}`);
    }
    if (dto.groupBy !== undefined) {
      params.push(dto.groupBy);
      fields.push(`group_by = $${params.length}`);
    }
    if (dto.viewMode !== undefined) {
      params.push(dto.viewMode);
      fields.push(`view_mode = $${params.length}`);
    }

    const sql = `
      UPDATE saved_views
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(sql, params);
    return result.rows[0];
  }

  async toggleFavorite(id: string, userId: string) {
    const current = await this.findOneView(id, userId);

    const result = await this.db.query(
      `UPDATE saved_views
       SET is_favorite = NOT is_favorite, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, userId],
    );

    return result.rows[0];
  }

  async deleteView(id: string, userId: string) {
    const current = await this.findOneView(id, userId);
    if (current.user_id !== userId) {
      throw new ForbiddenException('Only the view owner can delete this saved view');
    }

    await this.db.query(
      `UPDATE saved_views SET is_active = FALSE, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, userId],
    );

    return { success: true, message: 'Saved view removed successfully' };
  }

  getPresets(userId: string): SavedViewPreset[] {
    return [
      {
        id: 'preset-my-work',
        viewName: 'My Work',
        entityType: 'TASK',
        icon: 'UserCheck',
        color: 'blue',
        filters: { assigneeUserId: userId, isCompleted: false },
        viewMode: 'LIST',
        isPreset: true,
        description: 'All incomplete tasks assigned to you across projects',
      },
      {
        id: 'preset-awaiting-qa',
        viewName: 'Awaiting QA',
        entityType: 'TASK',
        icon: 'ShieldAlert',
        color: 'purple',
        filters: { statusCategory: 'TESTING', isCompleted: false },
        viewMode: 'LIST',
        isPreset: true,
        description: 'Tasks currently in QA, testing or review statuses',
      },
      {
        id: 'preset-awaiting-client',
        viewName: 'Awaiting Client',
        entityType: 'TASK',
        icon: 'Clock',
        color: 'amber',
        filters: { statusCategory: 'REVIEW', isCompleted: false },
        viewMode: 'LIST',
        isPreset: true,
        description: 'Tasks pending client clarification, approval or feedback',
      },
      {
        id: 'preset-blocked',
        viewName: 'Blocked',
        entityType: 'TASK',
        icon: 'AlertOctagon',
        color: 'rose',
        filters: { isBlocked: true },
        viewMode: 'LIST',
        isPreset: true,
        description: 'Tasks blocked by active episodes or unmet prerequisites',
      },
      {
        id: 'preset-unassigned',
        viewName: 'Unassigned',
        entityType: 'TASK',
        icon: 'UserX',
        color: 'slate',
        filters: { unassignedOnly: true, isCompleted: false },
        viewMode: 'LIST',
        isPreset: true,
        description: 'Active tasks without any assigned teammate',
      },
    ];
  }
}
