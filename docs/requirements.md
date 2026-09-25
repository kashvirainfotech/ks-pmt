# Software Requirements Specification (SRS)
## KS-PMT: Enterprise Project & Product Management Tool

---

## 1. Executive Summary & Purpose

**KS-PMT (Kashvira Solutions - Project & Product Management Tool)** is a centralized, enterprise-grade task and operations management platform designed specifically for an IT software company offering both **proprietary software products** (SaaS / on-premise solutions) and **custom project-based software development services**.

The system connects multiple company branches and locations under a unified operational umbrella, providing granular control over employees, clients, products, projects, versions, task workflows, billable effort tracking, dynamic auto-assignments, and real-time notifications across modern Web and Mobile (Android & iOS) interfaces.

---

## 2. Key Business Actors & Stakeholders

| Actor / Role | Description |
| :--- | :--- |
| **Super Admin / Executive Leadership** | Full system visibility, branch creation, corporate-wide reports, financial overview, global permission templates. |
| **Branch / Location Manager** | Manages local employees, branch-specific projects, attendance/location oversight, and branch task allocations. |
| **Department Head (HOD)** | Oversees departmental performance (e.g., Engineering, QA, Design, Support, Sales) and sets assignment rules. |
| **Product Manager (PdM)** | Manages product roadmaps, versions, feature releases, client licenses, and AMC support tasks. |
| **Project Manager (PM)** | Manages client project scope, budgets, milestones, sprint schedules, task allocations, and billable hours. |
| **Developer / Engineer** | Executes assigned tasks, updates statuses, logs work hours/efforts, creates subtasks, and attaches technical artifacts. |
| **QA / Test Engineer** | Reports bugs and issues, executes verification passes, updates testing statuses, and attaches bug evidence/logs. |
| **Support / Implementation Executive** | Handles client support tickets, installation/deployment tasks, and on-site support visits (via mobile GPS). |
| **Client / Stakeholder (External API)** | Consumes exposed REST APIs or receives automated milestone and task progress notifications. |

---

## 3. Functional Requirements

### 3.1 Company Structure & Location Master
- **Multi-Branch Support**: Ability to define multiple office branches/locations (e.g., Head Office, Development Centers, Regional Support Branches).
- **Location Attributes**: Branch Name, Branch Code, Address, City, State, Country, Postal Code, Phone, Official Email, Geofence / Geo-coordinates (Latitude, Longitude, Radius in meters), and Active/Inactive status.
- **Data Isolation & Visibility**: Option to restrict employee views to their assigned branch or grant multi-branch oversight based on role permissions.

### 3.2 Departments & Designations Master
- **Department Management**:
  - Dynamic creation of departments (e.g., Software Development, Mobile Apps, QA & Testing, UI/UX Design, DevOps & Infrastructure, Support & Maintenance, Business Analysis, Sales & Marketing).
  - Department Head mapping, description, and Active/Inactive status.
- **Designation Management**:
  - Hierarchical designation masters (e.g., Associate Software Engineer, Software Engineer, Senior Software Engineer, Tech Lead, Solution Architect, Project Manager, QA Analyst, QA Lead, Support Engineer).
  - Level hierarchy ranking (used in escalation and auto-assignment rules).
  - Association with departments and Active/Inactive status.

### 3.3 User & Employee Management
- **No Public Self-Registration**: Accounts are provisioned exclusively by authorized administrators or HR/Branch managers.
- **Employee Attributes**:
  - Personal & Official Info: Full Name, Employee Code, Official Email, Mobile Number, Emergency Contact.
  - Organizational Placement: Primary Branch, Secondary Branch access (optional), Department, Designation, Reporting Manager.
  - Status: Active / Inactive / Suspended.
  - Avatar / Profile Photo (AWS S3 storage).
- **Authentication**:
  - **Method 1**: Email Address + Secure Password (with Argon2 / bcrypt hashing, password expiry, and complexity validation).
  - **Method 2**: Mobile Number + One-Time Password (OTP) with expiration window (e.g., 5 minutes) and rate-limiting.
  - Multi-Factor / Device session management with remote revocation.

### 3.4 Dynamic Role-Based Access Control (RBAC) & Overrides
- **System Roles**: Standard templates (Super Admin, Branch Manager, Project Manager, Employee, QA, Support).
- **Granular Module Permissions**: Create, Read, Update, Delete, Export, Approve permissions across all entities (Projects, Products, Tasks, Timesheets, Financials, Clients, Users).
- **Dynamic Override Engine**:
  - **User-Level Overrides**: Ability to grant or revoke specific permissions for an individual employee regardless of their role.
  - **Branch-Level Overrides**: Ability to enforce branch-specific permission policies (e.g., Branch A users cannot view financial amounts, while Branch B users with the same designation can).

### 3.5 Client & Prospect Management (CRM-Lite)
- **Entities**: Prospects (Leads/Enquiries) and Active Clients.
- **Client Profile**: Company Name, Contact Person, Designation, Email, Phone, Alternate Phone, Billing Address, Tax/GST Identification, Website, Account Manager (Employee).
- **Lifecycle Transition**: Seamless conversion of a Prospect into an Active Client upon deal closing.
- **Mappings**: Direct association of clients to software products (licenses/subscriptions/AMC) and custom projects.

### 3.6 Product Management
- **Product Definition**: Manage the company's proprietary software products (e.g., ERP, Healthcare Suite, POS, HRMS, FinTech Gateway).
- **Attributes**: Product Name, Product Code, Category, Current Production Version, Tech Stack, Documentation Links, Active/Inactive status.
- **Financial Tracking**: Base License Price, Standard AMC Rate/Percentage, Recurring Subscription Plans, Implementation Service Fees.
- **Client Mapping**:
  - Association of client purchases (License Type: SaaS, On-Premise, Perpetual, Rental).
  - License Start Date, End Date, AMC Renewal Date, Support Tier, Annual Contract Value (ACV).

### 3.7 Project Management (Custom Development Services)
- **Project Definition**: Fixed-cost, Time & Material (T&M), or Dedicated Retainer projects built for clients.
- **Attributes**: Project Name, Project Code, Client Association, Branch Association, Project Manager, Tech Stack, Planned Start Date, Planned End Date, Actual Start Date, Actual End Date, Project Status (Planning, Active, On Hold, Completed, Terminated).
- **Financial Tracking**: Total Contract Value, Budgeted Hours, Hourly Rate (for T&M), Currency, Invoicing Milestones.
- **Team Allocation**: Assigning leads, developers, and QA engineers to specific projects with allocated allocation percentages and date ranges.

### 3.8 Version & Release Management
- **Applicable To**: Both Software Products and Projects.
- **Version Attributes**: Version Number (e.g., `v1.0.0`, `v2.4.1-hotfix`), Version Name/Codename, Target Release Date, Actual Release Date, Release Notes / Changelog, Status (Planning, In Progress, Code Freeze, Released, Deprecated).
- **Task Association**: Scheduling and tagging tasks, features, and bug fixes directly to a targeted Version/Release/Milestone.

### 3.9 Dynamic Task Management Engine
- **Dynamic Task Types Master**:
  - Configurable task types: `New Development`, `Bug / Defect`, `Issue`, `Enhancement`, `Training`, `Support Ticket`, `Infrastructure / DevOps`, `Documentation`, `R&D`.
  - Configurable attributes per task type (e.g., whether billable by default, default severity, custom fields).
- **Dynamic Task Status Workflow**:
  - Configurable status life-cycle per Task Type:
    - *Development Workflow*: `Open` -> `WIP (Work In Progress)` -> `Pending for Code Review` -> `Pending for Testing` -> `Testing` -> `Pending for Deployment` -> `Closed` -> `Cancelled`.
    - *Support Workflow*: `Open` -> `Under Investigation` -> `Client Waiting` -> `Resolved` -> `Closed`.
    - *Bug Workflow*: `Logged` -> `Triaged` -> `In Fixing` -> `Retesting` -> `Verified Closed` -> `Reopened`.
- **Task Core Attributes**:
  - Unique Task Code (e.g., `PRJ-1024`, `PRD-512`).
  - Title, Rich-text Description, Priority (`Low`, `Medium`, `High`, `Urgent`, `Critical`), Severity.
  - Project ID or Product ID + Version ID.
  - Parent Task ID (for hierarchical sub-tasks).
  - Multi-User Assignment: Provision to assign a single task to one or multiple employees with individual responsibility flags.
  - Dates: Planned Start Date, Planned End Date, Actual Start Date, Actual End Date.
  - Effort Estimates: Estimated Hours (Planned).
  - Billing & Commercials: `is_chargeable` (Boolean flag) and `charge_amount` (Decimal) with currency.
  - Status ID (linked to dynamic status master).
- **Sub-Task Support**:
  - Unlimited nesting or 2-level parent-child hierarchy.
  - Aggregated completion percentage and effort roll-up to parent tasks.
- **Task Attachments**:
  - Upload multiple files, screenshots, design mockups, error log traces, or test recordings.
  - Stored directly in **AWS S3** with pre-signed secure access and metadata saved in DB.
- **Task Comments & Collaboration**:
  - Threaded comment system on every task.
  - Rich text formatting with file/image attachments.
  - `@mention` functionality triggering instant notifications to tagged teammates.

### 3.10 Effort & Time Tracking (Worklogs / Timesheets)
- **Time Capture**:
  - Manual entry: Employee logs date, hours worked (e.g., 2.5 hrs), description/summary of work done.
  - Timer-based: Start / Pause / Stop timer directly within the web or mobile interface.
- **Effort Classification**:
  - Billable Hours vs. Non-Billable Hours.
  - Overtime tracking and weekend work classification.
- **Manager Approval Workflow**:
  - Weekly or monthly timesheet submission and sign-off by Project Managers / Branch Managers.

### 3.11 Automated Task Assignment Engine
- **Rule-Based Routing**:
  - Auto-assign tasks based on matrix criteria:
    - On Creation: Route `Bug` to QA Lead or Project Tech Lead; route `Support` to Department Support Tier 1.
    - On Status Change: When task moves to `Pending for Testing`, automatically reassign or notify assigned QA Engineer; when moved to `Pending for Deployment`, assign to DevOps Engineer.
  - Hierarchy & Round-Robin: Distribute incoming client support tickets or maintenance issues across available employees in a specific branch/department.

### 3.12 Notification System
- **Trigger Events**:
  - Task Created, Task Assigned / Reassigned, Status Changed, Comment Added, Mentioned in Comment, File Attached, Deadline Approaching (SLA Alert).
- **Delivery Channels**:
  - **In-App**: Real-time badge counter and notification flyout in web and mobile app.
  - **Mobile Push Notifications**: Firebase Cloud Messaging (FCM) on Android & iOS.
  - **Email Alerts**: Templated transactional emails via AWS SES / SendGrid.
- **User Notification Preferences**:
  - Custom toggles allowing users to select which channels receive alerts.

### 3.13 Activity Tracking & Comprehensive Audit Trail
- **System Event Logging**:
  - User Authentication: Login success, Login failure, OTP generated, Logout, Session expired.
  - Task Lifecycle: Task created, updated, status transition, assignee change, estimation update, file attachment/removal.
  - Financial Updates: Charge amount modified, project budget updated.
- **Audit Attributes**:
  - Entity Name, Record ID, Action Type (`INSERT`, `UPDATE`, `DELETE`, `LOGIN`, `DOWNLOAD`), Old Value (JSON), New Value (JSON), Performed By User ID, Timestamp, IP Address, User-Agent, and Geolocation metadata (from mobile device or IP lookup).

### 3.14 Mobile Applications (Android & iOS)
- **Native Experience & Performance**:
  - Built using a high-performance cross-platform framework (Flutter / React Native).
  - Responsive, touch-optimized UI conforming to Material 3 (Android) and Cupertino (iOS) guidelines.
- **Camera & File Upload**:
  - Native integration with camera to capture on-the-spot bug photos, whiteboards, or client sign-off documents.
  - Native file picker for PDF, documents, and images with automatic compression before S3 upload.
- **Location Access**:
  - GPS Geolocation capture on mobile login, field visits, or timesheet logging (useful for on-site implementation engineers and branch geofencing).
  - Foreground & optional background location verification with strict privacy controls.
- **Offline / Low-Connectivity Caching**:
  - Local SQLite / Hive caching allowing viewing of assigned tasks and drafts when offline, with auto-sync on reconnect.

### 3.15 Public & External REST APIs
- **Secure Integration Surface**:
  - Expose select REST APIs for external systems (e.g., client portals, Jira/GitHub integrations, HRMS synchronization).
  - Token-based API Key / OAuth2 authentication with rate-limiting and IP whitelisting.
  - Comprehensive Swagger / OpenAPI 3.0 documentation.

---

## 4. Universal Data & Database Standards

1. **Audit Columns**: Every table without exception must have:
   - `created_by` (UUID reference to `users.id`)
   - `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
   - `updated_by` (UUID reference to `users.id`, nullable on insert)
   - `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
2. **Master Active Flag**: Every master table must include:
   - `is_active` (BOOLEAN DEFAULT TRUE NOT NULL)
3. **Primary Keys**: UUIDv4 or BIGSERIAL for scalable, collision-free identification.
4. **Soft Deletion**: Sensitive entities (Tasks, Projects, Clients, Users) should utilize `deleted_at` timestamp for audit compliance.
5. **No Direct Execution**: All SQL scripts must reside in `dbscripts/` and must never be auto-applied to any database by AI agents.

---

## 5. Non-Functional Requirements (NFRs)

- **Performance**: Sub-200ms API response time for 95% of standard CRUD requests.
- **Scalability**: Support for 50+ branches, 5,000+ active users, and 1,000,000+ task records with PostgreSQL indexing and pagination.
- **Security**: OWASP Top 10 compliance, AES-256 encryption at rest (S3 & DB backups), TLS 1.3 in transit, parameterized SQL queries preventing SQL injection.
- **Availability**: 99.9% uptime target with automated cloud backups and stateless containerized backend services.
- **Mobile Responsiveness**: Web application fully adaptive from 320px mobile screens up to 4K ultra-wide desktop monitors.
