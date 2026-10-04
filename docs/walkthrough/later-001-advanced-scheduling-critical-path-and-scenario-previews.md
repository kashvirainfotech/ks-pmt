# LATER-001: Advanced Scheduling, Critical Path and Scenario Previews Walkthrough

## 1. Overview & Objectives

**LATER-001** implements **Advanced Scheduling, Critical Path Method (CPM), What-If Scenario Simulations, and Calibrated Composite Project Health Scoring**, fulfilling the advanced planning milestones in KS-PMT (Kashvira Infotech - Project & Product Management Tool).

Following the completion of **Tier E: Delivery Intelligence**, this capability builds on reliable calendars (`FND-001`), capacity allocations (`ANALYTICS-003`), and financial baselines (`ANALYTICS-004`) to give delivery managers forward-looking schedule visibility and scenario modeling tools.

### Core Acceptance Criteria & Technical Standards

1. **Enhanced Precedence Logic & Lag Windows**:
   - Extends task dependencies beyond standard Finish-to-Start (FS) to support:
     - **Start-to-Start (SS)**
     - **Finish-to-Finish (FF)**
     - **Start-to-Finish (SF)**
   - Configurable lead (negative lag/overlap) and lag (positive waiting duration) in hours or working days (`lag_duration_hours` and `lag_unit`).
   - Directed Acyclic Graph (DAG) cycle detection across all directed scheduling link types.

2. **Critical Path Method (CPM) Network Analysis**:
   - **Forward Pass**: Computes Earliest Start ($ES$) and Earliest Finish ($EF$) for all project tasks based on predecessor constraints and lag.
   - **Backward Pass**: Computes Latest Finish ($LF$) and Latest Start ($LS$) working backwards from project duration.
   - **Total Float / Slack**:
     $$\text{Total Slack} = LS - ES = LF - EF$$
   - **Critical Path Identification**: Tasks where $\text{Total Slack} \le 0$ are marked as critical. Any delay on these tasks directly slips the project completion date.

3. **What-If Schedule Scenario Modeler**:
   - Isolated sandbox simulations: PMs can model task delays, date shifts, capacity reductions, and priority reshuffling without mutating live task schedules.
   - Simulation summaries calculate projected end date, critical path length, schedule variance days, and float gain/loss.
   - **Explicit Application Gate**: Applying a simulated scenario to live task schedules requires explicit authorized confirmation (`SCHEDULE_SCENARIOS:APPLY`), updating live task dates in a transactional audit block.

4. **Calibrated Composite Project Health Scoring**:
   - Transparent, explainable scoring across 5 weighted dimensions (defaulting to 100% sum):
     - **Schedule Health (30%)**: Max slip days, overdue tasks, critical path health.
     - **Scope Health (20%)**: Change request volume, scope churn stability.
     - **Quality Health (20%)**: Defect density ratio (open bugs / active work).
     - **Blockers Health (15%)**: Active blocker episodes, max blocker age hours.
     - **Budget & Flow Health (15%)**: Budget consumption % vs baseline, WIP overrun.
   - **Missing Data Strategies**: `NEUTRAL_SCORE`, `EXCLUDE_DIMENSION`, or `STRICT_PENALTY`.
   - **Manual PM Narrative Override**: Allows PMs to override the algorithmic state (`GREEN`, `AMBER`, `RED`) with an attributable, audited justification.

---

## 2. Database Schema Artifacts

In accordance with the blank-database development policy defined in `AGENTS.md` and `GEMINI.md`, schema updates were maintained canonically in `dbscripts/tables/tables.sql`.

### 2.1 In-Place Table Update: `task_dependencies`

Updated `task_dependencies` in `dbscripts/tables/tables.sql`:
```sql
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL CHECK (link_type IN (
        'FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH',
        'BLOCKS', 'RELATED_TO', 'DUPLICATE_OF',
        'CAUSES', 'FIXED_BY', 'TESTED_BY', 'RELEASED_IN'
    )),
    lag_duration_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    lag_unit VARCHAR(10) NOT NULL DEFAULT 'HOURS' CHECK (lag_unit IN ('HOURS', 'DAYS')),
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_no_self_dependency CHECK (source_task_id <> target_task_id),
    CONSTRAINT uq_task_dependency UNIQUE (source_task_id, target_task_id, link_type)
);
```

### 2.2 Table 110: `schedule_scenarios` (`dbscripts/tables/tables.sql`)

Stores What-If scenario definitions and simulation run outcomes:
```sql
CREATE TABLE IF NOT EXISTS schedule_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scenario_code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    scenario_type VARCHAR(50) NOT NULL DEFAULT 'DATE_SHIFT' CHECK (
        scenario_type IN ('DATE_SHIFT', 'CAPACITY_REDUCTION', 'SCOPE_EXPANSION', 'PRIORITY_RESHUFFLE', 'CRITICAL_PATH_OPTIMIZATION', 'CUSTOM')
    ),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN ('DRAFT', 'SIMULATED', 'APPLIED', 'ARCHIVED')
    ),
    baseline_end_date DATE,
    simulated_end_date DATE,
    critical_path_length_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    schedule_variance_days INTEGER NOT NULL DEFAULT 0,
    impacted_tasks_count INTEGER NOT NULL DEFAULT 0,
    simulation_summary JSONB DEFAULT '{}'::jsonb,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_schedule_scenario_code UNIQUE (project_id, scenario_code)
);
```

### 2.3 Table 111: `schedule_scenario_task_overrides` (`dbscripts/tables/tables.sql`)

Maintains simulated task dates, estimates, and CPM slack metrics within a scenario:
```sql
CREATE TABLE IF NOT EXISTS schedule_scenario_task_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES schedule_scenarios(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    simulated_start_date DATE,
    simulated_due_date DATE,
    simulated_estimated_hours NUMERIC(8, 2),
    simulated_priority VARCHAR(20),
    earliest_start_date DATE,
    earliest_finish_date DATE,
    latest_start_date DATE,
    latest_finish_date DATE,
    total_slack_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    free_slack_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    is_critical_path BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_scenario_task_override UNIQUE (scenario_id, task_id)
);
```

### 2.4 Table 112: `project_health_score_configs` (`dbscripts/tables/tables.sql`)

Stores configurable weights and alert thresholds for the calibrated composite health score:
```sql
CREATE TABLE IF NOT EXISTS project_health_score_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    weight_schedule NUMERIC(5, 2) NOT NULL DEFAULT 30.00 CHECK (weight_schedule >= 0),
    weight_scope NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (weight_scope >= 0),
    weight_quality NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (weight_quality >= 0),
    weight_blockers NUMERIC(5, 2) NOT NULL DEFAULT 15.00 CHECK (weight_blockers >= 0),
    weight_budget_flow NUMERIC(5, 2) NOT NULL DEFAULT 15.00 CHECK (weight_budget_flow >= 0),
    schedule_slip_warning_days INTEGER NOT NULL DEFAULT 3,
    schedule_slip_critical_days INTEGER NOT NULL DEFAULT 7,
    defect_density_critical_ratio NUMERIC(5, 2) NOT NULL DEFAULT 0.25,
    blocker_age_critical_hours NUMERIC(6, 2) NOT NULL DEFAULT 48.00,
    missing_data_strategy VARCHAR(30) NOT NULL DEFAULT 'NEUTRAL_SCORE' CHECK (
        missing_data_strategy IN ('NEUTRAL_SCORE', 'EXCLUDE_DIMENSION', 'STRICT_PENALTY')
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_health_weights_sum CHECK (
        (weight_schedule + weight_scope + weight_quality + weight_blockers + weight_budget_flow) = 100.00
    )
);
```

### 2.5 Table 113: `project_health_evaluations` (`dbscripts/tables/tables.sql`)

Captures historical evaluation snapshots and manual PM override decisions:
```sql
CREATE TABLE IF NOT EXISTS project_health_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    composite_score NUMERIC(5, 2) NOT NULL CHECK (composite_score >= 0 AND composite_score <= 100),
    health_state VARCHAR(20) NOT NULL CHECK (health_state IN ('GREEN', 'AMBER', 'RED')),
    schedule_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    scope_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    quality_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    blockers_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    budget_flow_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    dimension_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    manual_override_state VARCHAR(20) CHECK (manual_override_state IS NULL OR manual_override_state IN ('GREEN', 'AMBER', 'RED')),
    override_reason TEXT,
    overridden_by UUID REFERENCES users(id) ON DELETE SET NULL,
    overridden_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2.6 Indexes, Permissions & Seed Data
- Indexes in `dbscripts/indexes/indexes.sql`: `idx_task_deps_link_lag`, `idx_scenarios_project`, `idx_scenarios_code`, `idx_scenario_overrides_scenario`, `idx_scenario_overrides_task`, `idx_scenario_overrides_cpm`, `idx_health_configs_project`, `idx_health_eval_project_date`, `idx_health_eval_state`.
- Permissions in `dbscripts/inserts/inserts.sql`:
  - `SCHEDULE_SCENARIOS:READ`
  - `SCHEDULE_SCENARIOS:MANAGE`
  - `SCHEDULE_SCENARIOS:APPLY`
  - `PROJECT_HEALTH:MANAGE`
- Sample seed data in `dbscripts/inserts/sample_data.sql`: Pre-seeded health config, evaluation snapshot, What-If scenario (`SCEN-LOG-OPT-01`), and task overrides.
- Verified static bundle generation with `node dbscripts/build-install.mjs` and `node --test dbscripts/build-install.test.mjs` (**2/2 passed**).

---

## 3. Backend REST Implementation

Created modular backend services under `server/src/modules/advanced-scheduling/`:

### 3.1 DTOs
- `create-scenario.dto.ts`: Validates project ID, code, title, and scenario type.
- `update-scenario-override.dto.ts`: Validates simulated task start date, due date, estimated hours, priority, and notes.
- `scenario-query.dto.ts`: Query parameters for project filtering.
- `health-config.dto.ts`: Validates 5 dimension weights summing to 100%, warning/critical slip days, defect ratio, and blocker age hours.
- `health-override.dto.ts`: Validates project ID, override state (`GREEN`, `AMBER`, `RED`), and mandatory explanation.

### 3.2 Service Implementation (`AdvancedSchedulingService`)
1. **Critical Path Method (CPM) Engine**:
   - Builds adjacency list for task nodes.
   - Performs topological sorting via Kahn's algorithm with cycle detection.
   - Forward pass calculates $ES$ and $EF$ taking into account dependency link types (FS, SS, FF, SF) and lead/lag duration.
   - Backward pass calculates $LF$, $LS$, and total slack.
   - Marks zero-slack tasks as critical and returns the ordered critical chain.
2. **What-If Scenario Simulation**:
   - Clones tasks into `schedule_scenario_task_overrides`.
   - Computes CPM metrics on the overrides and records `simulation_summary`.
   - `applyScenario`: Executes atomic transaction copying simulated dates onto live tasks and marking status as `APPLIED`.
3. **Calibrated Composite Project Health Score Engine**:
   - Pulls live project data for schedule slips, scope CRs, bug ratios, blocker episodes, and budget consumption.
   - Computes weighted composite score (0-100) and maps to `GREEN` ($\ge 80$), `AMBER` ($60-79$), or `RED` ($< 60$).
   - Returns both computed algorithmic health and active manual PM override state.

### 3.3 Controller Endpoints (`AdvancedSchedulingController`)
- `GET /api/advanced-scheduling/cpm/:projectId`: Calculate CPM analysis.
- `GET /api/advanced-scheduling/scenarios`: List What-If scenarios.
- `GET /api/advanced-scheduling/scenarios/:id`: Scenario details and overrides.
- `POST /api/advanced-scheduling/scenarios`: Create What-If scenario.
- `PATCH /api/advanced-scheduling/scenarios/:id/overrides/:overrideId`: Update task override.
- `POST /api/advanced-scheduling/scenarios/:id/simulate`: Trigger CPM simulation.
- `POST /api/advanced-scheduling/scenarios/:id/apply`: Apply simulated dates to live tasks.
- `GET /api/advanced-scheduling/health/:projectId`: Calibrated project health evaluation.
- `GET /api/advanced-scheduling/health/:projectId/history`: Health score history.
- `GET /api/advanced-scheduling/health-config`: Get health scoring weights.
- `PUT /api/advanced-scheduling/health-config`: Upsert health scoring weights.
- `POST /api/advanced-scheduling/health-override`: Record or clear manual PM override.

---

## 4. Frontend Workspace Implementation

### 4.1 Web Types & API Client
- Added `CPMTaskNode`, `CPMAnalysisResult`, `ScheduleScenario`, `ScheduleScenarioOverride`, `ProjectHealthConfig`, and `ProjectHealthEvaluation` to `web/src/types/index.ts`.
- Added `advancedSchedulingApi` to `web/src/api/endpoints.ts`.

### 4.2 Interactive Workspace (`AdvancedSchedulingWorkspace.tsx`)
Rendered with 4 dedicated tabs:
1. **Critical Path (CPM)**:
   - Summary cards for Critical Path Length (hours/days), Critical Tasks Count, Dependencies count, and Max Float Slack.
   - Sequence chain banner displaying driving zero-float tasks.
   - Precedence table showing task duration, predecessors with link type and lag, $ES / EF$, $LS / LF$, total slack, and critical path badges.
2. **What-If Scenarios Modeler**:
   - List of scenarios with status chips (`DRAFT`, `SIMULATED`, `APPLIED`).
   - Detailed scenario view showing baseline vs simulated end dates and schedule variance days.
   - Task override table with simulated start/due dates and CPM float impact.
   - "Apply to Live Tasks" button with confirmation safeguards.
   - Modal for initializing new What-If scenarios.
3. **Composite Health Score**:
   - Overall score gauge (0-100) with `GREEN` / `AMBER` / `RED` indicators.
   - Highlight of active manual PM overrides and justification note.
   - 5 dimensional breakdown cards (Schedule 30%, Scope 20%, Quality 20%, Blockers 15%, Budget/Flow 15%).
   - Historical evaluation snapshot ledger.
   - Modal for recording or clearing manual PM overrides.
4. **Health Calibration & Weights**:
   - Configurable weight sliders/inputs with live 100% total sum validation.
   - Configurable alert thresholds for slip days, defect density, and blocker age.

### 4.3 Routing & Navigation
- Added route `/advanced-scheduling` in `web/src/App.tsx`.
- Added **Critical Path & Scenarios** (`GitBranch` icon) under `Client Delivery` in `web/src/components/layout/Sidebar.tsx`.

---

## 5. Verification & Testing Results

1. **Database Schema & Static Installer**:
   - Manifest bundle rebuilt: `node dbscripts/build-install.mjs`
   - Test suite: `node --test dbscripts/build-install.test.mjs`
   - **Result**: `2/2 tests passed` (0 errors, valid manifest).
2. **Backend Server Build**:
   - Executed: `npm run build` in `server/` (`nest build`)
   - **Result**: Exit code `0` (Zero compilation errors).
3. **Frontend Web Build**:
   - Executed: `npm run build` in `web/` (`tsc && vite build`)
   - **Result**: Exit code `0` (`2170 modules transformed`, production bundle generated).
4. **Documentation & Checklists**:
   - Checked off `LATER-001` in `docs/tasks-checklist.md` (Section 11.6).
   - Updated `README.md` to reflect `LATER-001` as implemented across completed modules and roadmap lists.
