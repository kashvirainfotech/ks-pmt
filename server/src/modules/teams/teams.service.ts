import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  CreateComponentDto,
  UpdateComponentDto,
  CreateComponentDependencyDto,
  LinkTaskComponentsDto,
} from './dto/teams.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly db: DatabaseService) {}

  // =========================================================================
  // 1. DELIVERY TEAMS MANAGEMENT (PLAN-004)
  // =========================================================================

  async createTeam(dto: CreateTeamDto, userId: string) {
    const existing = await this.db.query(
      `SELECT id FROM teams WHERE team_code = $1`,
      [dto.teamCode],
    );
    if (existing.rows.length > 0) {
      throw new BadRequestException(`Team code '${dto.teamCode}' already exists`);
    }

    return await this.db.transaction(async (client) => {
      const res = await client.query(
        `INSERT INTO teams (team_code, team_name, description, lead_user_id, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [dto.teamCode, dto.teamName, dto.description || null, dto.leadUserId || null, userId],
      );
      const team = res.rows[0];

      if (dto.projectIds && dto.projectIds.length > 0) {
        for (const pId of dto.projectIds) {
          await client.query(
            `INSERT INTO team_projects (team_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [team.id, pId],
          );
        }
      }

      if (dto.productIds && dto.productIds.length > 0) {
        for (const prId of dto.productIds) {
          await client.query(
            `INSERT INTO team_products (team_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [team.id, prId],
          );
        }
      }

      // If lead is specified, add them as LEAD member in team_members
      if (dto.leadUserId) {
        await client.query(
          `INSERT INTO team_members (team_id, user_id, role_in_team, joined_date, allocation_percentage, created_by)
           VALUES ($1, $2, 'LEAD', CURRENT_DATE, 100.00, $3)
           ON CONFLICT (team_id, user_id) DO UPDATE SET role_in_team = 'LEAD', is_active = TRUE`,
          [team.id, dto.leadUserId, userId],
        );
      }

      return team;
    });
  }

  async getTeams(filter?: { projectId?: string; productId?: string }) {
    let query = `
      SELECT 
        t.*,
        u.first_name || ' ' || COALESCE(u.last_name, '') as lead_name,
        u.email as lead_email,
        u.avatar_url as lead_avatar,
        (SELECT COUNT(*)::int FROM team_members tm WHERE tm.team_id = t.id AND tm.is_active = TRUE) as member_count,
        (SELECT COUNT(*)::int FROM software_components sc WHERE sc.owner_team_id = t.id AND sc.is_active = TRUE) as components_count,
        COALESCE((
          SELECT json_agg(json_build_object('id', p.id, 'name', p.project_name))
          FROM team_projects tp JOIN projects p ON tp.project_id = p.id WHERE tp.team_id = t.id
        ), '[]'::json) as projects,
        COALESCE((
          SELECT json_agg(json_build_object('id', pr.id, 'name', pr.product_name))
          FROM team_products tpr JOIN products pr ON tpr.product_id = pr.id WHERE tpr.team_id = t.id
        ), '[]'::json) as products
      FROM teams t
      LEFT JOIN users u ON t.lead_user_id = u.id
      WHERE t.is_active = TRUE
    `;

    const params: any[] = [];
    if (filter?.projectId) {
      params.push(filter.projectId);
      query += ` AND EXISTS (SELECT 1 FROM team_projects tp WHERE tp.team_id = t.id AND tp.project_id = $${params.length})`;
    }
    if (filter?.productId) {
      params.push(filter.productId);
      query += ` AND EXISTS (SELECT 1 FROM team_products tpr WHERE tpr.team_id = t.id AND tpr.product_id = $${params.length})`;
    }

    query += ` ORDER BY t.team_name ASC`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getTeamById(id: string) {
    const res = await this.db.query(
      `SELECT 
        t.*,
        u.first_name || ' ' || COALESCE(u.last_name, '') as lead_name,
        u.email as lead_email,
        u.avatar_url as lead_avatar
       FROM teams t
       LEFT JOIN users u ON t.lead_user_id = u.id
       WHERE t.id = $1`,
      [id],
    );
    if (res.rows.length === 0) throw new NotFoundException('Team not found');
    const team = res.rows[0];

    // Fetch members
    const membersRes = await this.db.query(
      `SELECT 
        tm.*,
        u.first_name, u.last_name, u.email, u.employee_code, u.avatar_url,
        b.branch_name, r.role_name, d.designation_name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN branches b ON u.primary_branch_id = b.id
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN designations d ON u.designation_id = d.id
       WHERE tm.team_id = $1 AND tm.is_active = TRUE
       ORDER BY tm.role_in_team = 'LEAD' DESC, u.first_name ASC`,
      [id],
    );
    team.members = membersRes.rows;

    // Fetch projects
    const projectsRes = await this.db.query(
      `SELECT p.id, p.project_code, p.project_name, p.project_status
       FROM team_projects tp
       JOIN projects p ON tp.project_id = p.id
       WHERE tp.team_id = $1`,
      [id],
    );
    team.projects = projectsRes.rows;

    // Fetch products
    const productsRes = await this.db.query(
      `SELECT pr.id, pr.product_code, pr.product_name, pr.current_version
       FROM team_products tpr
       JOIN products pr ON tpr.product_id = pr.id
       WHERE tpr.team_id = $1`,
      [id],
    );
    team.products = productsRes.rows;

    // Fetch components
    const componentsRes = await this.db.query(
      `SELECT id, component_code, component_name, criticality, technology_stack
       FROM software_components
       WHERE owner_team_id = $1 AND is_active = TRUE`,
      [id],
    );
    team.components = componentsRes.rows;

    return team;
  }

  private async ensureTeamExists(id: string) {
    const res = await this.db.query(`SELECT id FROM teams WHERE id = $1 AND is_active = TRUE`, [id]);
    if (res.rows.length === 0) throw new NotFoundException('Team not found');
  }

  private async ensureComponentExists(id: string) {
    const res = await this.db.query(`SELECT id FROM software_components WHERE id = $1 AND is_active = TRUE`, [id]);
    if (res.rows.length === 0) throw new NotFoundException('Component not found');
  }

  async updateTeam(id: string, dto: UpdateTeamDto, userId: string) {
    await this.ensureTeamExists(id);

    return await this.db.transaction(async (client) => {
      const updates: string[] = [];
      const params: any[] = [id];

      if (dto.teamName !== undefined) {
        params.push(dto.teamName);
        updates.push(`team_name = $${params.length}`);
      }
      if (dto.description !== undefined) {
        params.push(dto.description);
        updates.push(`description = $${params.length}`);
      }
      if (dto.leadUserId !== undefined) {
        params.push(dto.leadUserId);
        updates.push(`lead_user_id = $${params.length}`);
      }

      params.push(userId);
      updates.push(`updated_by = $${params.length}`);
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      const res = await client.query(
        `UPDATE teams SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        params,
      );

      if (dto.projectIds !== undefined) {
        await client.query(`DELETE FROM team_projects WHERE team_id = $1`, [id]);
        for (const pId of dto.projectIds) {
          await client.query(
            `INSERT INTO team_projects (team_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, pId],
          );
        }
      }

      if (dto.productIds !== undefined) {
        await client.query(`DELETE FROM team_products WHERE team_id = $1`, [id]);
        for (const prId of dto.productIds) {
          await client.query(
            `INSERT INTO team_products (team_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, prId],
          );
        }
      }

      return res.rows[0];
    });
  }

  async deleteTeam(id: string, userId: string) {
    await this.ensureTeamExists(id);
    await this.db.query(
      `UPDATE teams SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [userId, id],
    );
    return { success: true, message: 'Team deactivated' };
  }

  // =========================================================================
  // 2. TEAM MEMBERSHIP MANAGEMENT (Effective-dated)
  // =========================================================================

  async addMember(teamId: string, dto: AddTeamMemberDto, userId: string) {
    await this.ensureTeamExists(teamId);

    const res = await this.db.query(
      `INSERT INTO team_members (
        team_id, user_id, role_in_team, joined_date, left_date, allocation_percentage, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
      ON CONFLICT (team_id, user_id) DO UPDATE
      SET role_in_team = EXCLUDED.role_in_team,
          joined_date = EXCLUDED.joined_date,
          left_date = EXCLUDED.left_date,
          allocation_percentage = EXCLUDED.allocation_percentage,
          is_active = TRUE,
          updated_by = EXCLUDED.created_by,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        teamId,
        dto.userId,
        dto.roleInTeam || 'DEVELOPER',
        dto.joinedDate || new Date().toISOString().slice(0, 10),
        dto.leftDate || null,
        dto.allocationPercentage ?? 100.0,
        userId,
      ],
    );
    return res.rows[0];
  }

  async removeMember(teamId: string, memberUserId: string, userId: string) {
    await this.db.query(
      `UPDATE team_members
       SET is_active = FALSE,
           left_date = CURRENT_DATE,
           updated_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE team_id = $2 AND user_id = $3`,
      [userId, teamId, memberUserId],
    );
    return { success: true, message: 'Member removed from team' };
  }

  // =========================================================================
  // 3. SOFTWARE COMPONENTS CATALOG (PLAN-004)
  // =========================================================================

  async createComponent(dto: CreateComponentDto, userId: string) {
    if (dto.entityType === 'PRODUCT' && !dto.productId) {
      throw new BadRequestException('productId is required when entityType is PRODUCT');
    }
    if (dto.entityType === 'PROJECT' && !dto.projectId) {
      throw new BadRequestException('projectId is required when entityType is PROJECT');
    }

    // Check code uniqueness within project/product
    const existing = await this.db.query(
      `SELECT id FROM software_components 
       WHERE component_code = $1 AND entity_type = $2 
         AND ((product_id = $3 AND $3 IS NOT NULL) OR (project_id = $4 AND $4 IS NOT NULL))`,
      [dto.componentCode, dto.entityType, dto.productId || null, dto.projectId || null],
    );
    if (existing.rows.length > 0) {
      throw new BadRequestException(`Component code '${dto.componentCode}' already exists in this scope`);
    }

    const res = await this.db.query(
      `INSERT INTO software_components (
        component_code, component_name, description, entity_type,
        product_id, project_id, owner_team_id, tech_lead_user_id,
        technology_stack, documentation_url, repository_url, criticality, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        dto.componentCode,
        dto.componentName,
        dto.description || null,
        dto.entityType,
        dto.productId || null,
        dto.projectId || null,
        dto.ownerTeamId || null,
        dto.techLeadUserId || null,
        dto.technologyStack || null,
        dto.documentationUrl || null,
        dto.repositoryUrl || null,
        dto.criticality || 'TIER_2_CORE',
        userId,
      ],
    );
    return res.rows[0];
  }

  async getComponents(filter?: {
    entityType?: string;
    projectId?: string;
    productId?: string;
    ownerTeamId?: string;
    criticality?: string;
  }) {
    let query = `
      SELECT 
        sc.*,
        t.team_name as owner_team_name,
        t.team_code as owner_team_code,
        u.first_name || ' ' || COALESCE(u.last_name, '') as tech_lead_name,
        u.email as tech_lead_email,
        p.project_name,
        pr.product_name,
        (SELECT COUNT(*)::int FROM task_components tc WHERE tc.component_id = sc.id) as task_count,
        (SELECT COUNT(*)::int FROM component_dependencies cd WHERE cd.component_id = sc.id) as outbound_dep_count,
        (SELECT COUNT(*)::int FROM component_dependencies cd WHERE cd.depends_on_component_id = sc.id) as inbound_dep_count
      FROM software_components sc
      LEFT JOIN teams t ON sc.owner_team_id = t.id
      LEFT JOIN users u ON sc.tech_lead_user_id = u.id
      LEFT JOIN projects p ON sc.project_id = p.id
      LEFT JOIN products pr ON sc.product_id = pr.id
      WHERE sc.is_active = TRUE
    `;

    const params: any[] = [];
    if (filter?.entityType) {
      params.push(filter.entityType);
      query += ` AND sc.entity_type = $${params.length}`;
    }
    if (filter?.projectId) {
      params.push(filter.projectId);
      query += ` AND sc.project_id = $${params.length}`;
    }
    if (filter?.productId) {
      params.push(filter.productId);
      query += ` AND sc.product_id = $${params.length}`;
    }
    if (filter?.ownerTeamId) {
      params.push(filter.ownerTeamId);
      query += ` AND sc.owner_team_id = $${params.length}`;
    }
    if (filter?.criticality) {
      params.push(filter.criticality);
      query += ` AND sc.criticality = $${params.length}`;
    }

    query += ` ORDER BY sc.criticality ASC, sc.component_name ASC`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getComponentById(id: string) {
    const res = await this.db.query(
      `SELECT 
        sc.*,
        t.team_name as owner_team_name,
        t.team_code as owner_team_code,
        u.first_name || ' ' || COALESCE(u.last_name, '') as tech_lead_name,
        u.email as tech_lead_email,
        u.avatar_url as tech_lead_avatar,
        p.project_name,
        pr.product_name
       FROM software_components sc
       LEFT JOIN teams t ON sc.owner_team_id = t.id
       LEFT JOIN users u ON sc.tech_lead_user_id = u.id
       LEFT JOIN projects p ON sc.project_id = p.id
       LEFT JOIN products pr ON sc.product_id = pr.id
       WHERE sc.id = $1`,
      [id],
    );
    if (res.rows.length === 0) throw new NotFoundException('Component not found');
    const component = res.rows[0];

    // Outbound dependencies (components this component depends on)
    const outboundRes = await this.db.query(
      `SELECT cd.*, target.component_code, target.component_name, target.criticality,
              t.team_name as target_team_name
       FROM component_dependencies cd
       JOIN software_components target ON cd.depends_on_component_id = target.id
       LEFT JOIN teams t ON target.owner_team_id = t.id
       WHERE cd.component_id = $1 AND cd.is_active = TRUE`,
      [id],
    );
    component.outboundDependencies = outboundRes.rows;

    // Inbound dependencies (components that depend on this component)
    const inboundRes = await this.db.query(
      `SELECT cd.*, source.component_code, source.component_name, source.criticality,
              t.team_name as source_team_name
       FROM component_dependencies cd
       JOIN software_components source ON cd.component_id = source.id
       LEFT JOIN teams t ON source.owner_team_id = t.id
       WHERE cd.depends_on_component_id = $1 AND cd.is_active = TRUE`,
      [id],
    );
    component.inboundDependencies = inboundRes.rows;

    return component;
  }

  async updateComponent(id: string, dto: UpdateComponentDto, userId: string) {
    await this.ensureComponentExists(id);

    const updates: string[] = [];
    const params: any[] = [id];

    if (dto.componentName !== undefined) {
      params.push(dto.componentName);
      updates.push(`component_name = $${params.length}`);
    }
    if (dto.description !== undefined) {
      params.push(dto.description);
      updates.push(`description = $${params.length}`);
    }
    if (dto.ownerTeamId !== undefined) {
      params.push(dto.ownerTeamId);
      updates.push(`owner_team_id = $${params.length}`);
    }
    if (dto.techLeadUserId !== undefined) {
      params.push(dto.techLeadUserId);
      updates.push(`tech_lead_user_id = $${params.length}`);
    }
    if (dto.technologyStack !== undefined) {
      params.push(dto.technologyStack);
      updates.push(`technology_stack = $${params.length}`);
    }
    if (dto.documentationUrl !== undefined) {
      params.push(dto.documentationUrl);
      updates.push(`documentation_url = $${params.length}`);
    }
    if (dto.repositoryUrl !== undefined) {
      params.push(dto.repositoryUrl);
      updates.push(`repository_url = $${params.length}`);
    }
    if (dto.criticality !== undefined) {
      params.push(dto.criticality);
      updates.push(`criticality = $${params.length}`);
    }

    params.push(userId);
    updates.push(`updated_by = $${params.length}`);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const res = await this.db.query(
      `UPDATE software_components SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return res.rows[0];
  }

  async deleteComponent(id: string, userId: string) {
    await this.ensureComponentExists(id);
    await this.db.query(
      `UPDATE software_components SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [userId, id],
    );
    return { success: true, message: 'Component deactivated' };
  }

  // =========================================================================
  // 4. COMPONENT ARCHITECTURE DEPENDENCIES (PLAN-004)
  // =========================================================================

  async addComponentDependency(componentId: string, dto: CreateComponentDependencyDto, userId: string) {
    if (componentId === dto.dependsOnComponentId) {
      throw new BadRequestException('A component cannot depend on itself');
    }
    await this.ensureComponentExists(componentId);
    await this.ensureComponentExists(dto.dependsOnComponentId);

    const res = await this.db.query(
      `INSERT INTO component_dependencies (
        component_id, depends_on_component_id, dependency_type, description, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (component_id, depends_on_component_id, dependency_type) DO UPDATE
      SET description = EXCLUDED.description, is_active = TRUE, updated_by = $5, updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [componentId, dto.dependsOnComponentId, dto.dependencyType || 'CONSUMES_API', dto.description || null, userId],
    );
    return res.rows[0];
  }

  async removeComponentDependency(dependencyId: string) {
    const res = await this.db.query(
      `DELETE FROM component_dependencies WHERE id = $1 RETURNING id`,
      [dependencyId],
    );
    if (res.rows.length === 0) throw new NotFoundException('Dependency link not found');
    return { success: true, message: 'Component dependency removed' };
  }

  async getComponentArchitectureMap(entityType: string, entityId: string) {
    const isProject = entityType === 'PROJECT';
    const componentsRes = await this.db.query(
      `SELECT 
        sc.id, sc.component_code, sc.component_name, sc.criticality, sc.technology_stack,
        t.team_name as owner_team,
        (SELECT COUNT(*)::int FROM task_components tc WHERE tc.component_id = sc.id) as task_count
       FROM software_components sc
       LEFT JOIN teams t ON sc.owner_team_id = t.id
       WHERE sc.is_active = TRUE AND ${isProject ? 'sc.project_id = $1' : 'sc.product_id = $1'}
       ORDER BY sc.component_name ASC`,
      [entityId],
    );

    const componentIds = componentsRes.rows.map((c) => c.id);
    let dependencies: any[] = [];

    if (componentIds.length > 0) {
      const depRes = await this.db.query(
        `SELECT cd.id, cd.component_id as source_id, cd.depends_on_component_id as target_id, cd.dependency_type, cd.description
         FROM component_dependencies cd
         WHERE cd.component_id = ANY($1::uuid[]) OR cd.depends_on_component_id = ANY($1::uuid[])`,
        [componentIds],
      );
      dependencies = depRes.rows;
    }

    return {
      nodes: componentsRes.rows,
      links: dependencies,
    };
  }

  // =========================================================================
  // 5. COMPONENT DRILL-DOWN DASHBOARD (Authorized Work / Defect / Debt)
  // =========================================================================

  async getComponentDashboard(componentId: string, currentUser: any) {
    const component = await this.getComponentById(componentId);

    // Permission Scope Check: Ensure current user has access to this project/product
    if (currentUser?.role_code !== 'ROLE_SUPER_ADMIN') {
      if (component.project_id) {
        const hasProjectAccess = await this.db.query(
          `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND is_active = TRUE`,
          [component.project_id, currentUser.id],
        );
        if (hasProjectAccess.rows.length === 0) {
          // Check if user has global projects read permission
          const hasGlobalPerm = currentUser.permissions?.includes('PROJECTS:READ');
          if (!hasGlobalPerm) {
            throw new ForbiddenException('You are not authorized to access work items for this component');
          }
        }
      }
    }

    // Query tasks linked to this component
    const tasksRes = await this.db.query(
      `SELECT 
        t.id, t.task_code, t.title, t.priority, t.severity, t.hierarchy_level,
        t.resolution, t.resolution_details, t.is_blocked, t.estimated_hours,
        t.created_at, t.planned_end_date,
        ts.status_name, ts.color_hex as status_color, ts.stage_category,
        tt.type_name, tt.type_code, tt.color_code as type_color,
        tc.is_primary as is_primary_component,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.first_name || ' ' || COALESCE(u.last_name, ''), 'avatar', u.avatar_url))
           FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id),
          '[]'::json
        ) as assignees
       FROM task_components tc
       JOIN tasks t ON tc.task_id = t.id
       LEFT JOIN task_statuses ts ON t.status_id = ts.id
       LEFT JOIN task_types tt ON t.task_type_id = tt.id
       WHERE tc.component_id = $1
       ORDER BY t.created_at DESC`,
      [componentId],
    );

    const allTasks = tasksRes.rows;

    // Filter categories:
    // 1. Active work: status category not DONE/CANCELLED
    const activeTasks = allTasks.filter(
      (t) => !['COMPLETED', 'DONE', 'CLOSED', 'CANCELLED'].includes(t.stage_category?.toUpperCase()),
    );

    // 2. Bugs & Defects: type_code = 'BUG' or has severity
    const defects = allTasks.filter(
      (t) =>
        t.type_code?.toUpperCase() === 'BUG' ||
        Boolean(t.severity) ||
        Boolean(t.resolution),
    );

    // 3. Technical Debt: type_code = 'TECH_DEBT' / 'TECHNICAL_DEBT' or title matches
    const techDebt = allTasks.filter(
      (t) =>
        ['TECH_DEBT', 'TECHNICAL_DEBT'].includes(t.type_code?.toUpperCase()) ||
        t.title?.toLowerCase().includes('debt') ||
        t.title?.toLowerCase().includes('refactor'),
    );

    // Critical/High severity issues count
    const criticalIssuesCount = allTasks.filter(
      (t) =>
        ['CRITICAL', 'URGENT', 'HIGH'].includes(t.priority?.toUpperCase()) ||
        ['CRITICAL', 'BLOCKER', 'MAJOR'].includes(t.severity?.toUpperCase()),
    ).length;

    return {
      component,
      summary: {
        totalTasksCount: allTasks.length,
        activeTasksCount: activeTasks.length,
        defectsCount: defects.length,
        techDebtCount: techDebt.length,
        criticalIssuesCount,
      },
      activeTasks,
      defects,
      techDebt,
      allTasks,
    };
  }

  // =========================================================================
  // 6. TASK COMPONENTS MAPPING
  // =========================================================================

  async linkTaskComponents(taskId: string, dto: LinkTaskComponentsDto, userId: string) {
    const task = (await this.db.query(`SELECT id FROM tasks WHERE id = $1`, [taskId])).rows[0];
    if (!task) throw new NotFoundException('Task not found');

    return await this.db.transaction(async (client) => {
      await client.query(`DELETE FROM task_components WHERE task_id = $1`, [taskId]);

      for (const compId of dto.componentIds) {
        const isPrimary = compId === dto.primaryComponentId;
        await client.query(
          `INSERT INTO task_components (task_id, component_id, is_primary, created_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (task_id, component_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
          [taskId, compId, isPrimary, userId],
        );
      }

      const res = await client.query(
        `SELECT tc.*, sc.component_code, sc.component_name, sc.criticality
         FROM task_components tc
         JOIN software_components sc ON tc.component_id = sc.id
         WHERE tc.task_id = $1`,
        [taskId],
      );
      return res.rows;
    });
  }

  async getTaskComponents(taskId: string) {
    const res = await this.db.query(
      `SELECT tc.*, sc.component_code, sc.component_name, sc.criticality, sc.technology_stack
       FROM task_components tc
       JOIN software_components sc ON tc.component_id = sc.id
       WHERE tc.task_id = $1
       ORDER BY tc.is_primary DESC, sc.component_name ASC`,
      [taskId],
    );
    return res.rows;
  }
}
