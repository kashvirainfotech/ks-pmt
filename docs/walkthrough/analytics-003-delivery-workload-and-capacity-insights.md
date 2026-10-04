# ANALYTICS-003: Delivery, Workload and Capacity Insights Walkthrough

## 1. Overview & Objectives

**ANALYTICS-003** implements Delivery, Workload and Capacity Insights within **Tier E: Delivery Intelligence** of the KS-PMT platform. It provides realistic, calendar-aware capacity forecasting, non-additive capacity vs. demand views, explicit co-assignee effort share partitioning, non-task overhead reservations, explainable skill matching, and collective team estimation reliability metrics.

### Core Acceptance Criteria & Architectural Rules

1. **Non-Additive Capacity, Allocated, and Demand Views**:
   - Working calendar availability (`FND-001`), scheduled holidays, approved leaves, and task demand are maintained as separate, non-additive dimensions.
   - **Net Available Capacity** = base calendar working hours minus approved leaves, company holidays, and non-task capacity reservations.
   - Committed project allocation percentage (`project_members.allocation_percentage`) and active task demand hours are never merged into an additive sum, avoiding misleading double-booking or artificial capacity inflation.

2. **Split Co-Assignee Effort Partitioning**:
   - Tasks with multiple assignees explicitly partition demand via `effort_share_percentage` on `task_assignees`.
   - Co-assignee shares are validated to sum to exactly 100.0% of task demand.
   - When unspecified, effort is divided equally ($1/N$), guaranteeing that the full task estimate is never duplicated to every collaborator.

3. **Explicit Capacity Reservations**:
   - Overhead activities that consume delivery bandwidth are explicitly accounted for: support rotations, mentoring, research & innovation, recurring meetings, training/upskilling, and administrative overhead.
   - Reservations deduct from base calendar working hours before net delivery capacity is calculated.

4. **Team-Level Estimation Reliability & Accuracy**:
   - **Estimation Accuracy Index (EAI)**:
     $$\text{EAI} = 1 - \frac{|\text{Estimated} - \text{Actual}|}{\max(\text{Estimated}, \text{Actual})}$$
   - **Estimation Bias**: Tracks whether teams consistently over-estimate or under-estimate relative to actual logged time.
   - **On-Time Delivery (OTD %)**: Completed tasks delivered on or before due date.
   - **First-Time-Right (FTR %)**: Completed tasks delivered without rework cycles.
   - **Strict Governance**: Metrics are strictly aggregated at the team/sprint level to improve sizing and forecasting. Automatic employee/branch productivity rankings or gamification are deferred and prohibited.

5. **Explainable Skill Suggestions**:
   - Evaluates candidate suitability combining skill proficiency (40%), bandwidth availability (40%), and timezone overlap (20%).
   - Provides natural language scoring rationales with transparent component breakdowns to empower PMs and Tech Leads.

---

## 2. Database Schema Artifacts

### 2.1 Canonical Tables (`dbscripts/tables/tables.sql`)

In accordance with the blank-database development policy, schema definitions were updated in place:

1. **In-Place Update: `task_assignees`**:
   - Added column: `effort_share_percentage NUMERIC(5, 2) DEFAULT NULL CHECK (effort_share_percentage IS NULL OR (effort_share_percentage >= 0 AND effort_share_percentage <= 100))`

2. **Table 101: `skills`**:
   - `id`: UUID primary key (`gen_random_uuid()`).
   - `skill_code`: VARCHAR(50) UNIQUE NOT NULL.
   - `name`: VARCHAR(150) NOT NULL.
   - `category`: VARCHAR(50) NOT NULL (e.g., `BACKEND`, `FRONTEND`, `DATABASE`, `CLOUD_DEVOPS`, `ARCHITECTURE`, `QA_TESTING`, `SECURITY`, `DOMAIN`).
   - `description`: TEXT.
   - Standard audit columns: `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

3. **Table 102: `user_skills`**:
   - `id`: UUID primary key.
   - `user_id`: UUID NOT NULL REFERENCES `users(id)`.
   - `skill_id`: UUID NOT NULL REFERENCES `skills(id)`.
   - `proficiency_level`: INTEGER NOT NULL (1 to 5: Beginner to Master).
   - `years_of_experience`: NUMERIC(4, 1).
   - `is_certified`: BOOLEAN DEFAULT FALSE.
   - `last_used_date`: DATE.
   - `notes`: TEXT.
   - `UNIQUE (user_id, skill_id)`.

4. **Table 103: `task_required_skills`**:
   - `id`: UUID primary key.
   - `task_id`: UUID NOT NULL REFERENCES `tasks(id)`.
   - `skill_id`: UUID NOT NULL REFERENCES `skills(id)`.
   - `minimum_proficiency`: INTEGER DEFAULT 1 (1 to 5).
   - `is_mandatory`: BOOLEAN DEFAULT TRUE.
   - `UNIQUE (task_id, skill_id)`.

5. **Table 104: `capacity_reservations`**:
   - `id`: UUID primary key.
   - `reservation_code`: VARCHAR(50) UNIQUE NOT NULL.
   - `user_id`: UUID NOT NULL REFERENCES `users(id)`.
   - `reservation_type`: VARCHAR(50) NOT NULL (`SUPPORT_ROTATION`, `MENTORING`, `INNOVATION_RESEARCH`, `RECURRING_MEETINGS`, `TRAINING`, `ADMINISTRATIVE_OVERHEAD`).
   - `title`: VARCHAR(200) NOT NULL.
   - `description`: TEXT.
   - `start_date`, `end_date`: DATE NOT NULL.
   - `daily_hours`: NUMERIC(4, 2) NOT NULL DEFAULT 1.0 CHECK (daily_hours > 0 AND daily_hours <= 24).
   - `total_reserved_hours`: NUMERIC(8, 2) NOT NULL DEFAULT 0.0.
   - `is_recurring`: BOOLEAN DEFAULT FALSE.
   - `recurrence_pattern`: VARCHAR(50).
   - `approved_by`: UUID REFERENCES `users(id)`.

6. **Table 105: `team_capacity_metrics`**:
   - `id`: UUID primary key.
   - `team_id`: UUID REFERENCES `delivery_teams(id)`.
   - `project_id`: UUID REFERENCES `projects(id)`.
   - `sprint_id`: UUID REFERENCES `sprints(id)`.
   - `metric_period`: VARCHAR(50) NOT NULL.
   - `total_estimated_hours`, `total_actual_hours`: NUMERIC(10, 2) NOT NULL DEFAULT 0.0.
   - `estimation_accuracy_index`: NUMERIC(5, 4) NOT NULL DEFAULT 0.0.
   - `estimation_bias`: VARCHAR(20) DEFAULT 'BALANCED'.
   - `estimation_bias_percentage`: NUMERIC(6, 2) DEFAULT 0.0.
   - `on_time_delivery_rate`: NUMERIC(5, 2) DEFAULT 0.0.
   - `first_time_right_rate`: NUMERIC(5, 2) DEFAULT 0.0.
   - `rework_tasks_count`, `completed_tasks_count`: INTEGER DEFAULT 0.

### 2.2 Optimized Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_skills_category`, `idx_skills_code`
- `idx_user_skills_user`, `idx_user_skills_skill`
- `idx_task_skills_task`, `idx_task_skills_skill`
- `idx_capacity_reservations_user`, `idx_capacity_reservations_dates`, `idx_capacity_reservations_type`, `idx_capacity_reservations_code`
- `idx_team_capacity_lookup`, `idx_team_capacity_period`

### 2.3 RBAC Permissions & Seed Data (`dbscripts/inserts/`)
- Added permissions in `inserts.sql`:
  - `CAPACITY:READ`: View capacity, workload heatmaps, skill suggestions, and team estimation metrics.
  - `CAPACITY:MANAGE`: Manage reservations, split effort shares, and configure required skills.
- Associated permissions with `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TECH_LEAD`, and `DEVELOPER`.
- Sample seed data in `sample_data.sql`:
  - Standard technical and architecture skills (PostgreSQL, NestJS, React, AWS, Docker/K8s, Microservices).
  - User skill proficiencies mapped to key engineers.
  - Realistic capacity reservations (Support rotation, Architecture mentoring, Innovation spikes).
  - Historical closed sprint capacity metrics for trend reporting.

---

## 3. Backend Architecture (`server/src/modules/capacity-insights/`)

- **Module**: `CapacityInsightsModule` registered in `AppModule`.
- **Service**: `CapacityInsightsService` providing:
  - `getCapacityWorkload(query)`: Reconciles working calendars via `CalendarsService.calculateWorkingCapacity`, subtracts non-task `capacity_reservations`, computes committed project allocation %, partitions active task demand according to co-assignee effort shares, and calculates demand utilization ratios.
  - `splitCoAssigneeEffort(dto)`: Enforces validation that the sum of effort shares across assigned collaborators equals 100.0%, updating `task_assignees`.
  - `getSkillSuggestions(taskId)`: Analyzes required task skills, queries user skill inventories, evaluates availability over the scheduled window, calculates timezone compatibility, and ranks candidates with transparent component scoring.
  - `getTeamEstimationMetrics(query)`: Aggregates completed tasks, computing EAI, estimation bias direction, OTD %, and FTR % rates.
  - Master CRUD methods for skills catalog, user skills, task required skills, and capacity reservations.
- **Controller**: `CapacityInsightsController` with `@UseGuards(JwtAuthGuard, DynamicRbacGuard)` and `@Permissions()`.

---

## 4. Frontend Workspace (`web/src/components/capacity-insights/`)

- **Workspace Component**: `CapacityInsightsWorkspace.tsx`
  - **Workload & Capacity Heatmap Tab**:
    - Executive summary KPI cards (Net Available Hours, Active Task Demand, Capacity Utilization %, Team Health Distribution).
    - Team member capacity table with individual drilldown modals showing base hours, overhead reservations, committed allocation %, active assigned tasks, and effective demand.
  - **Co-Assignee Effort Splitter Tab**:
    - Task lookup by ID/code.
    - Dynamic percentage sliders and inputs with live total validation checking for exact 100.0% sum.
    - 1-click "Reset to Equal Shares (1/N)" button.
  - **Explainable Skill Matching Tab**:
    - Candidate evaluation displaying Total Fit Score, transparent breakdown bars (Skill Proficiency 40%, Availability 40%, Timezone 20%), matched skill chips, missing mandatory skill warnings, and natural language explanation callouts.
  - **Team Estimation Reliability Tab**:
    - Scorecards for Estimation Accuracy Index (EAI), Estimation Bias, On-Time Delivery (OTD %), and First-Time-Right (FTR %).
    - Governance disclaimer emphasizing team-level collective improvement and barring individual employee rankings.
    - Historical sprint trend table.
  - **Reservations & Skills Catalog Tab**:
    - Capacity reservations management with Add Reservation modal.
    - Skills inventory with category badges and Add Skill modal.
- **Routing & Navigation**:
  - Registered route `/capacity-insights` in `web/src/App.tsx`.
  - Added "Capacity & Workload" navigation link under Client Delivery in `web/src/components/layout/Sidebar.tsx`.

---

## 5. Verification & Validation

1. **Database Installer Integrity**:
   - `node dbscripts/build-install.mjs` executed cleanly.
   - `node --test dbscripts/build-install.test.mjs` passed 2/2 tests without errors.
2. **Backend Server Compilation**:
   - `npm run build` in `server/` completed with code `0`.
3. **Frontend Web Compilation**:
   - TypeScript checks and Vite production build completed cleanly.
4. **Git & Database Policy Compliance**:
   - Zero `git commit` or `git push` commands executed.
   - Zero SQL statements executed directly against live database instances.
