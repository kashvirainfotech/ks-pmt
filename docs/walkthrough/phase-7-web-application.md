# Walkthrough: Phase 7 - Modern Responsive Web Application (`web/`)

## 1. Overview
In **Phase 7**, we engineered the enterprise, mobile-responsive single-page web application for KS-PMT (Kashvira Solutions - Project & Product Management Tool) using **React 18**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Lucide Icons**.

The web application connects seamlessly with the NestJS backend REST APIs, providing corporate authentication, multi-branch switching, real-time notifications, interactive Kanban workflows, S3 file uploads, and organizational master controls.

---

## 2. Implemented Architecture & UI Components

### 2.1 UI Framework & Responsive Layout
- **App Shell & Layout** ([`AppLayout.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/layout/AppLayout.tsx)):
  - Collapsible desktop navigation sidebar and mobile sliding drawer with backdrop overlay.
  - Top header ([`Header.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/layout/Header.tsx)) featuring branch context switcher, notifications popover with live polling and unread counter badges, dark/light mode toggle, and user profile menu.
  - Global Command Palette (`Ctrl+K`) for instant live debounced search across tasks and projects.
- **Context Providers**:
  - [`AuthContext.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/context/AuthContext.tsx): Manages authentication state, corporate session tokens, selected branch, and dynamic RBAC `hasPermission(code)` checks.
  - [`ThemeContext.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/context/ThemeContext.tsx): Manages system/user light and dark mode toggles persisted in `localStorage`.
- **API Client & Interceptors** ([`client.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/api/client.ts)):
  - Automatic `Bearer` token injection and branch context propagation via `X-Branch-ID` headers.
  - Automatic silent refresh token renewal on `401 Unauthorized` responses.
  - Response unwrapper for the backend `{ success: true, data: ... }` envelope.

---

### 2.2 Screens & User Flows

#### 1. Dual Authentication Screen ([`LoginPage.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/auth/LoginPage.tsx))
- Left hero showcase banner presenting KS-PMT core enterprise capabilities.
- Right authentication card with tabs:
  - **Email & Password**: Corporate login with error envelopes.
  - **Mobile & OTP**: Registered mobile number input, OTP dispatch countdown timer, and 6-digit PIN verification.
  - Prohibits open public registration in accordance with internal corporate security standards.

#### 2. Bento-Grid Executive & Branch Dashboard ([`BentoGridDashboard.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/dashboard/BentoGridDashboard.tsx))
- **KPI Cards**: Total active tasks, urgent/high priority counter, effort logged in hours, and total billable rupee value.
- **Workflow Status Breakdown Widget**: Interactive progress bars displaying task distribution across dynamic status stages.
- **Branch Operational Hub Widget**: Summary of active branch hubs, Head Office tagging, and geofence status.
- **Recent Projects & Tasks Activity**: Quick jump links directly into tasks and project boards.

#### 3. Dynamic Tasks Workspace ([`TasksView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/tasks/TasksView.tsx))
- **Dual View Modes**:
  - **Interactive Kanban Board** ([`KanbanBoard.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/tasks/KanbanBoard.tsx)): Horizontally scrollable status columns rendered from dynamic workflow statuses with stage indicators and task counter pills.
  - **Filterable Table / List View**: Multi-column sorting and filtering by branch, task type, priority, and search text.
- **Task Card** ([`TaskCard.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/tasks/TaskCard.tsx)):
  - Priority badge, task type pill, assignee avatar chips, subtasks checklist ratio (`x/y`), effort ratio (`spent/est hrs`), and billable amount indicator.
- **Task Detail Drawer** ([`TaskDrawer.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/tasks/TaskDrawer.tsx)):
  - **Dynamic Workflow State Transitions**: Evaluates allowed next statuses via the backend state machine.
  - **Subtasks Checklist**: Real-time completion checkboxes and instant subtask addition.
  - **Interactive Time Tracker**: Live start/pause/stop elapsed timer + manual working hour logger with billable classification.
  - **AWS S3 File Storage**: Pre-signed upload integration with client-side upload progress bar, document preview chips, and pre-signed download triggers.
  - **Threaded Comments**: Nested reply conversations with `@mention` support.
  - **Financial Settings**: Inline chargeable toggle and billable amount updater.
- **Create Task Modal** ([`CreateTaskModal.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/tasks/CreateTaskModal.tsx)):
  - Modal form for creating tasks mapped to branches, projects, products, task types, priorities, and dates.

#### 4. Projects & Products Management ([`ProjectsView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/projects/ProjectsView.tsx))
- **Client Projects**: Contract amounts, hourly rates, budget hours, and billing types (Fixed Price, T&M, Retainer).
- **Software Products**: Commercial product packages, standard license fees, annual AMC pricing, and client mappings.
- **Milestones & Versions**: Release roadmap tags with planned delivery dates and completion badges.

#### 5. CRM & Clients ([`ClientsView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/projects/ClientsView.tsx))
- Client registry with prospect pipeline tags.
- Direct "Convert to Active Client" action.

#### 6. Timesheets & Effort Tracking ([`TimesheetView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/timesheet/TimesheetView.tsx))
- Detailed worklogs table with billable hours calculation, employee attribution, and manager approval indicators.

#### 7. Organizational Masters & RBAC Setup ([`AdminMastersView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/admin/AdminMastersView.tsx))
- **Branches**: Geofencing radius settings, city hubs, and Head Office flags.
- **Departments & Designations**: Hierarchy level sorting (1-20) and Department HOD mapping.
- **Admin User Provisioning**: Secure account creation with email login, OTP login toggles, and branch mappings.
- **Dynamic Workflows**: Task type badges, colors, chargeable defaults, and workflow status stages.

#### 8. Central Audit Trail & Activity Logs ([`AuditLogsView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/audit/AuditLogsView.tsx))
- Filterable security event log with action types, entity names, user attribution, and IP addresses.
- Detailed JSON diff modal displaying before (`old_values`) and after (`new_values`) snapshots.

---

## 3. Verification & Build
- Ran `npm run build` in `web/`.
- Verified 0 TypeScript compilation errors.
- Verified Vite production bundle generation (`dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css`).
- Checked off all items in Section 4 of [docs/tasks-checklist.md](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/tasks-checklist.md).
- Zero direct database executions or git commits/pushes performed.
