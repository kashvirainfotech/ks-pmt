# Phase 4 Walkthrough: Business Modules (Clients, Products, Projects, Versions)

**Execution Date**: 2026-09-25  
**Component**: Business REST API Modules (`server/src/modules/`)  
**Status**: Completed, Compiled & Verified  

---

## 1. Overview & Architecture

Phase 4 establishes the commercial and portfolio entities of the IT software company, orchestrating:
1. **CRM & Lead Conversion**: Managing prospective clients (`PROSPECT`) and transitioning them into active paying accounts (`ACTIVE_CLIENT`).
2. **Proprietary Products & Licensing**: Tracking company products with base license pricing, standard AMC percentages, and mapping client subscriptions/licenses.
3. **Custom Development Projects**: Capturing contract amounts, hourly billing rates, budget hours, team allocations, and real-time financial summaries.
4. **Versions & Release Milestones**: Semantic versioning and sprint schedules mapped to either products or projects, tracking task completion progress.

```
+-----------------------------------------------------------------------------------------+
|                                    Clients & Prospects                                  |
|                 (Prospect -> Deal Closing -> Active Client Conversion)                  |
+-----------------------------------------------------------------------------------------+
                                 |                                 |
                                 v                                 v
+------------------------------------------------+   +------------------------------------+
|               Software Products                |   |          Custom Projects           |
| (Licenses, Subscriptions, AMC Renewal Reminders|   | (Fixed Cost, T&M, Budgets, Hourly  |
|  & Product Manager Oversight)                  |   |  Rates, Team Capacity Allocation)  |
+------------------------------------------------+   +------------------------------------+
                                 \                                 /
                                  \                               /
                                   v                             v
                        +-----------------------------------------------+
                        |          Versions & Release Milestones        |
                        | (Target Release Dates, Sprints & Task Rollups)|
                        +-----------------------------------------------+
```

---

## 2. Implemented Modules & Endpoints

### 2.1 Clients & Prospects CRM (`/api/v1/clients`)
Handles client lifecycle management, branch tagging, and account manager relationships.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/clients` | Authenticated | Create a new lead/prospect or active client with tax/GST ID and branch mapping. |
| `GET` | `/api/v1/clients` | Authenticated | Paginated and filterable list (by `clientType`, `branchId`, `accountManagerUserId`, `search`). |
| `GET` | `/api/v1/clients/:id` | Authenticated | Detailed client profile including all mapped product licenses and active custom projects. |
| `PUT` | `/api/v1/clients/:id` | Authenticated | Update client profile, contact person, or address. |
| `POST` | `/api/v1/clients/:id/convert-to-active` | Authenticated | **Lead Conversion**: Transitions `client_type` from `PROSPECT` to `ACTIVE_CLIENT`. |
| `PATCH` | `/api/v1/clients/:id/status` | Authenticated | Toggle active/inactive status. |

---

### 2.2 Products Master & Client License Mapping (`/api/v1/products`)
Enables tracking of company's proprietary software products, recurring licenses, and AMC renewals.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/products` | `PRODUCTS:MANAGE` | Create software product with base license price, standard AMC %, and currency. |
| `GET` | `/api/v1/products` | Authenticated | List products with licensed client counts, active licenses, and recurring revenue metrics. |
| `GET` | `/api/v1/products/:id` | Authenticated | Get product details with active client licenses and planned versions. |
| `PUT` | `/api/v1/products/:id` | `PRODUCTS:MANAGE` | Update product pricing or metadata. |
| `PATCH` | `/api/v1/products/:id/status` | `PRODUCTS:MANAGE` | Toggle active status. |
| `POST` | `/api/v1/products/:id/clients` | `PRODUCTS:MANAGE` | **Map Client License**: Maps a client purchase (`SAAS_SUBSCRIPTION`, `ON_PREMISE_PERPETUAL`, `ANNUAL_LEASE`) with contract value, AMC amount, start/end dates, and AMC renewal date. |
| `GET` | `/api/v1/products/:id/clients` | Authenticated | List all active client licenses and renewal schedules for this product. |
| `PUT` | `/api/v1/products/clients/:mappingId` | `PRODUCTS:MANAGE` | Update license terms or AMC renewal dates. |
| `DELETE` | `/api/v1/products/clients/:mappingId` | `PRODUCTS:MANAGE` | Terminate or expire a client license. |

---

### 2.3 Custom Development Projects & Team Allocations (`/api/v1/projects`)
Manages client service contracts, billing models, budgeted hours, team rosters, and real-time financial tracking.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/projects` | `PROJECTS:CREATE` | Create custom development project: Client ID, Branch ID, Manager ID, Billing Type (`FIXED_COST`, `TIME_AND_MATERIAL`, `RETAINER`), Contract Amount, Hourly Rate, Budgeted Hours, and Dates. |
| `GET` | `/api/v1/projects` | `PROJECTS:READ` | Paginated list of projects with client name, branch, manager, total tasks, and team members. |
| `GET` | `/api/v1/projects/:id` | `PROJECTS:READ` | Detailed project view with team roster, planned versions, and task counts. |
| `PUT` | `/api/v1/projects/:id` | `PROJECTS:UPDATE` | Update project parameters, actual dates, or commercials. |
| `PATCH` | `/api/v1/projects/:id/status` | `PROJECTS:UPDATE` | Toggle active/inactive status. |
| `POST` | `/api/v1/projects/:id/members` | `PROJECTS:UPDATE` | **Team Allocation**: Allocates an employee with project role, allocation percentage (1-100%), and start/end dates. |
| `GET` | `/api/v1/projects/:id/members` | `PROJECTS:READ` | List all allocated team members and their allocation capacity. |
| `DELETE` | `/api/v1/projects/:id/members/:userId` | `PROJECTS:UPDATE` | Deallocate an employee from the project team. |
| `GET` | `/api/v1/projects/:id/financial-summary` | `PROJECTS:VIEW_FINANCIALS` | **Financial Overview**: Returns total contract value, budgeted hours, actual logged hours, billable hours, chargeable task amounts, and realized revenue (evaluated via `DynamicRbacGuard` with branch/user override support). |

---

### 2.4 Versions & Release Milestones (`/api/v1/versions`)
Provides milestone scheduling and version planning across both products and custom projects.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/versions` | `PROJECTS:UPDATE` | Create release version or sprint milestone linked to either a Product or a Project (`chk_version_entity` enforced). |
| `GET` | `/api/v1/versions/product/:productId` | Authenticated | List all release versions for a software product with task completion counts. |
| `GET` | `/api/v1/versions/project/:projectId` | Authenticated | List all versions and sprints for a custom development project. |
| `GET` | `/api/v1/versions/:id` | Authenticated | Get version details along with all scheduled tasks and current status badges. |
| `PUT` | `/api/v1/versions/:id` | `PROJECTS:UPDATE` | Update version release dates or status (`PLANNING`, `IN_PROGRESS`, `CODE_FREEZE`, `RELEASED`, `ARCHIVED`). |
| `PATCH` | `/api/v1/versions/:id/status` | `PROJECTS:UPDATE` | Toggle active status. |

---

## 3. Verification & Compliance Checklist

- [x] **Financial Tracking Enforced**:
  - Products track `base_license_price`, `standard_amc_percentage`, and mapped client license/AMC values.
  - Projects track `contract_amount`, `hourly_rate`, `budgeted_hours`, and dynamic financial aggregations.
- [x] **Dynamic RBAC Protection**:
  - Financial summary endpoint protected by `PROJECTS:VIEW_FINANCIALS` with branch/user override support.
- [x] **No Direct DB Execution**: Queries executed safely via `DatabaseService` using parameterized SQL.
- [x] **No Git Commits or Pushes**: All files remain unstaged for manual developer review and commitment.
- [x] **Clean Compilation**: `npm run build` executed and passed with 0 errors.

---

## 4. Next Step
Proceed to **Phase 5: Dynamic Task Engine, Multi-Assignees, Subtasks, Time Tracking, and Auto-Assignment Matrix** (`server/src/modules/tasks`, `server/src/modules/time-logs`, `server/src/modules/comments`, `server/src/modules/assignment`).
