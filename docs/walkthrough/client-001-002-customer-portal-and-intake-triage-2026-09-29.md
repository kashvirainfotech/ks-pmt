# Walkthrough: CLIENT-001 & CLIENT-002 — Customer Portal, Contact Identity, Scoped Access & Intake Triage

**Date:** 2026-09-29  
**Specification Reference:** `CLIENT-001` & `CLIENT-002` (Software Requirements Specification, Section 4.6 & Increment C)  
**Author:** Senior Full-Stack Engineering Team (8–10 Years Experience Standard)

---

## 1. Executive Summary

Enterprise client service and delivery requires structured, secure customer engagement without exposing internal operational mechanics. Most development platforms either completely isolate clients to disconnected support desks (creating siloed delivery friction) or invite external users into internal Jira boards where confidential employee cost rates, internal retrospectives, technical debt deliberations, or other client tickets risk exposure.

**CLIENT-001** and **CLIENT-002** deliver an enterprise customer collaboration architecture:
1. **Zero-Trust Client Identity & Scoped Access (`CLIENT-001`):**
   - **Invitation-Only Lifecycle:** No public self-registration. Contacts are invited to specific client organizations with secure, expiration-bound invitation tokens.
   - **Client Roles & Approver Flags:** Clear separation of permissions via `CLIENT_USER` (standard request submission & tracking), `CLIENT_ADMIN` (contact administration), and an independently toggled `CLIENT_APPROVER` flag (empowered to approve scopes, quotations, and UAT).
   - **Granular Project Grants (`client_contact_projects`):** Explicit matrix granting per-project capabilities (`can_view_milestones`, `can_create_requests`, `can_approve_scope`, `can_approve_uat`).
   - **Strict Allowlisted Boundary:** Client endpoints only return sanitized customer fields. Internal notes, developer cost rates, profit margins, employee salaries, and raw internal efforts are strictly inaccessible.
2. **Private Intake & Customer-Facing Progress Triage (`CLIENT-002`):**
   - **Structured Intake Requests (`client_intake_requests`):** Supports `BUG`, `SUPPORT`, and `CHANGE_REQUEST` categories with client priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), business impact descriptions, and operational breadth (`SINGLE_USER` to `ALL_CLIENTS`).
   - **Decoupled Urgency vs. Technical Severity:** Client urgency is captured cleanly while internal PMs/Tech Leads triage with separate technical severity (`TRIVIAL`, `MINOR`, `MAJOR`, `CRITICAL`, `BLOCKER`) and internal delivery priority.
   - **Customer-Safe Status Mapping:** Internal development states are mapped to customer-friendly milestones:
     - `NEW` → `Received`
     - `TRIAGED` / `UNDER_REVIEW` → `In review`
     - `IN_DELIVERY` → `In progress`
     - `IN_INTERNAL_QA` → `In QA`
     - `AWAITING_CLIENT_ACCEPTANCE` → `Awaiting your acceptance`
     - `ACCEPTED` / `RESOLVED` / `CLOSED` → `Accepted/Closed`
   - **Dual-Visibility Clarifications Stream (`client_request_messages`):** Public messages shared with clients vs. private internal-only notes (`is_internal_only = true`), completely filtered out by server-side query projections for any client contact token.
   - **1-Click Delivery Task Conversion & Linking:** Direct conversion of triaged intake requests into internal backlog tasks or linking to existing delivery tasks.

---

## 2. Database Schema Architecture

In accordance with [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md), canonical schema definitions were created in `dbscripts/` and consolidated into `dbscripts/install.psql` without executing DDL directly on live databases.

### 2.1 Table Definitions (`dbscripts/tables/tables.sql`)

```sql
-- 40. Client Contacts (CLIENT-001)
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    title VARCHAR(100),
    department VARCHAR(100),
    portal_role VARCHAR(30) NOT NULL DEFAULT 'CLIENT_USER' CHECK (portal_role IN ('CLIENT_USER', 'CLIENT_ADMIN')),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_approver BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'ACTIVE', 'REVOKED')),
    password_hash VARCHAR(255),
    invitation_token VARCHAR(255),
    invitation_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 41. Client Contact Project Grants (CLIENT-001)
CREATE TABLE IF NOT EXISTS client_contact_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES client_contacts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    can_view_milestones BOOLEAN NOT NULL DEFAULT TRUE,
    can_create_requests BOOLEAN NOT NULL DEFAULT TRUE,
    can_approve_scope BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve_uat BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contact_project UNIQUE (contact_id, project_id)
);

-- 42. Client Intake Requests (CLIENT-002)
CREATE TABLE IF NOT EXISTS client_intake_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    submitted_by_contact_id UUID NOT NULL REFERENCES client_contacts(id),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    component_id UUID REFERENCES software_components(id) ON DELETE SET NULL,
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('BUG', 'SUPPORT', 'CHANGE_REQUEST')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    client_priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (client_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    business_impact_category VARCHAR(50) NOT NULL CHECK (business_impact_category IN ('OPERATIONS_HALTED', 'WORKAROUND_AVAILABLE', 'COSMETIC_MINOR', 'FINANCIAL_TRANSACTIONS', 'COMPLIANCE_LEGAL')),
    impact_breadth VARCHAR(30) NOT NULL DEFAULT 'SINGLE_USER' CHECK (impact_breadth IN ('SINGLE_USER', 'SINGLE_DEPARTMENT', 'WHOLE_ORGANIZATION', 'ALL_CLIENTS')),
    urgency_reason TEXT,
    internal_status VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (internal_status IN ('NEW', 'TRIAGED', 'UNDER_REVIEW', 'IN_DELIVERY', 'IN_INTERNAL_QA', 'AWAITING_CLIENT_ACCEPTANCE', 'ACCEPTED', 'RESOLVED', 'CLOSED', 'REJECTED')),
    technical_severity VARCHAR(20) CHECK (technical_severity IN ('TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER')),
    delivery_priority VARCHAR(20) CHECK (delivery_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    target_delivery_milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    duplicate_of_request_id UUID REFERENCES client_intake_requests(id) ON DELETE SET NULL,
    triaged_by UUID REFERENCES users(id),
    triaged_at TIMESTAMP WITH TIME ZONE,
    triage_notes TEXT,
    rejection_reason TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 43. Client Request Messages / Clarifications (CLIENT-002)
CREATE TABLE IF NOT EXISTS client_request_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES client_intake_requests(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('CLIENT_CONTACT', 'INTERNAL_USER')),
    sender_user_id UUID REFERENCES users(id),
    sender_contact_id UUID REFERENCES client_contacts(id),
    message TEXT NOT NULL,
    is_internal_only BOOLEAN NOT NULL DEFAULT FALSE,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Permissions Seed Data (`dbscripts/inserts/inserts.sql`)

Added permissions and assigned them to `ROLE_SUPER_ADMIN`, `ROLE_PROJECT_MANAGER`, and `ROLE_SUPPORT_EXEC`:
- `CLIENT_PORTAL:READ`: View client contacts, portal access states, and project grants.
- `CLIENT_PORTAL:MANAGE`: Invite client contacts, grant/revoke project permissions, and deactivate credentials.
- `CLIENT_INTAKE:READ`: View inbound client tickets, customer priorities, and impact assessments.
- `CLIENT_INTAKE:TRIAGE`: Triage tickets, assign technical severity, link/create delivery tasks, and post internal notes.

Installer manifest regenerated cleanly using:
```bash
node dbscripts/build-install.mjs
```

---

## 3. Backend Architecture & Security Boundaries (NestJS)

### 3.1 Strict Dual-Principal JWT Strategy (`jwt.strategy.ts`)
The JWT strategy dynamically checks if `payload.isClientContact` is true. If present, it validates the token against `client_contacts` ensuring the contact is `ACTIVE` and `is_active = true`. If false, it validates against internal `users`.

### 3.2 Dynamic RBAC Isolation Guard (`rbac.guard.ts`)
To prevent token-swapping or escalation attacks:
```typescript
if (user?.isClientContact) {
    throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Client contacts cannot access internal staff resources',
        error: 'Forbidden'
    });
}
```
Any client contact attempting to invoke staff endpoints is immediately blocked.

### 3.3 Scoped Client Contact Guard (`client-contact.guard.ts`)
Customer-facing endpoints (`/api/v1/client-portal/*`) require the `@UseGuards(ClientContactGuard)` decorator, ensuring only authenticated client contacts can access customer resources.

### 3.4 Service Implementation (`client-portal.service.ts`)
- **Contact Activation:**
  - `inviteContact`: Generates a cryptographic token (`crypto.randomBytes(32).toString('hex')`) with a 7-day expiration and saves project grants.
  - `acceptInvite`: Validates token, enforces minimum 8-character password hashing with `bcrypt.hash(password, 10)`, and transitions contact status to `ACTIVE`.
  - `loginContact`: Authenticates client credentials, updates `last_login_at`, and issues client-scoped JWT.
- **Data Isolation & Sanitized Mapping:**
  - `mapCustomerStatus`: Infallibly projects internal statuses to customer-friendly milestones (`Received`, `In review`, `In progress`, `In QA`, `Awaiting your acceptance`, `Accepted/Closed`).
  - `createRequest`: Requires project grant check (`can_create_requests`). Injects client ID directly from `req.user.clientId` rather than accepting client-supplied values.
  - `getRequestMessages`: Project filter `WHERE is_internal_only = FALSE` when invoked by client contacts, ensuring internal staff deliberation is never visible to external stakeholders.
  - `triageRequest`: Allows setting technical severity, internal priority, duplicate linking, and 1-click task conversion.

---

## 4. Frontend Architecture & Workspace Design (React + Tailwind)

### 4.1 Internal Client Contacts View (`ClientContactsView.tsx`)
- **Directory & Metrics:** Real-time breakdown of Total Contacts, Active Users, Pending Invitations, and Designated Approvers.
- **Invitation Flow:** Invite modal with client selection, email, role (`CLIENT_USER` vs. `CLIENT_ADMIN`), approver checkbox, and selectable project grants. Produces a direct, copyable invitation redemption link.
- **Project Permissions Drawer:** Granular checklist enabling PMs to toggle `can_view_milestones`, `can_create_requests`, `can_approve_scope`, and `can_approve_uat` per project.
- **Lifecycle Actions:** Resend invitation, revoke access, and reactivate contacts.

### 4.2 Internal Intake & Triage Radar (`ClientIntakeTriageView.tsx`)
- **Impact Summary Widgets:** Displays requests halting operations, financial/compliance impact items, high client urgency items, and pending triage queues.
- **Triage Slide-Over Drawer:**
  - Full request review with client impact category and breadth badges.
  - Severity assessment (`TRIVIAL`..`BLOCKER`) & delivery priority (`LOW`..`URGENT`).
  - 1-Click "Convert to Delivery Task" button generating a backlog task with pre-filled title, description, and link back to the intake request.
  - Existing task search and duplicate linking.
  - Activity & Clarifications Stream with toggleable "Internal Note Only (Hidden from client)" switch.

### 4.3 Customer Portal Workspace (`CustomerPortalWorkspace.tsx`)
- **Customer Branded Header:** Organization badge, authenticated contact name, and portal role badge.
- **"My Requests" Radar:** Filterable by status and type with customer-facing progress badges.
- **"Submit Request" Modal:** Constrained strictly to projects granted to the active contact. Captures impact category, breadth, reproduction steps, and urgency rationale.
- **Public Clarification Thread:** Customers can view updates and submit replies directly to the delivery team.
- **"Permitted Projects" & "Licensed Products" Tabs:** Transparent overview of granted contracts and product licenses.

---

## 5. Verification & Test Execution

### 5.1 Automated Unit Tests
A dedicated unit test suite was implemented in `server/src/modules/client-portal/client-portal.service.spec.ts` covering 12 test cases:
- Contact invitation creation with project grants
- Invitation acceptance and password hashing
- Secure credential login with invalid password rejection
- Project grant permissions checking
- Scoped request creation enforcing client ownership
- Customer-friendly status projection
- Strict message filtering hiding `is_internal_only = true` notes from clients
- Triage updates, duplicate linking, and task conversion
- Impact summary metrics aggregation

**All 20 backend test suites passed (136/136 tests):**
```
PASS src/modules/client-portal/client-portal.service.spec.ts
PASS src/modules/auth/auth.service.spec.ts
PASS src/modules/tasks/tasks.service.spec.ts
PASS src/modules/sprints/sprints.service.spec.ts
PASS src/modules/workflow-schemes/workflow-schemes.service.spec.ts
PASS src/modules/handoffs/handoffs.service.spec.ts
PASS src/modules/teams/teams.service.spec.ts
PASS src/modules/components/components.service.spec.ts
PASS src/modules/timesheets/timesheets.service.spec.ts
PASS src/modules/saved-views/saved-views.service.spec.ts
...
Test Suites: 20 passed, 20 total
Tests:       136 passed, 136 total
Snapshots:   0 total
Time:        4.512 s
```

### 5.2 Frontend Production Bundle Build
The Vite production bundle was verified:
```bash
npm run build
```
Output:
```
vite v5.4.14 building for production...
transforming...
✓ 1934 modules transformed.
rendering chunks...
computing chunk sizes...
dist/index.html                   0.85 kB │ gzip:  0.42 kB
dist/assets/index-D7jCg0lC.css   57.65 kB │ gzip: 10.21 kB
dist/assets/index-CLrE0R-O.js   789.28 kB │ gzip: 219.78 kB
✓ built in 1.75s
```

---

## 6. Conclusion & Next Delivery Target

The implementation of `CLIENT-001` and `CLIENT-002` establishes a zero-trust, multi-tenant customer collaboration boundary for KS-PMT, providing seamless intake and triage without leaking sensitive internal delivery details.

**Next Feature Target:**  
`CLIENT-003: Requirements & Acceptance Traceability` — Versioned functional requirements and acceptance criteria directly linked to tasks, manual QA test runs, and client sign-offs.
