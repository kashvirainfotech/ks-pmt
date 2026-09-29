# System Walkthrough & Operational Guide

## KS-PMT: Multi-Branch Project & Product Management System

Updated: 2026-09-29 (IST). This guide describes intended user journeys, including planned capabilities; it is not evidence that every step works in the current build. See [the checklist](tasks-checklist.md) and [README status matrix](../README.md#-feature-matrix--implementation-status). Live SMS, S3 acceptance, email/FCM, native builds and the new client/product journeys remain pending as documented.

---

## 1. System Overview & Core User Flows

KS-PMT orchestrates software development and product management across multiple branches through an integrated web and mobile ecosystem. This walkthrough illustrates key operational workflows from initial configuration to daily task execution.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin
    actor PM as Project Manager
    actor Dev as Developer / Mobile
    actor QA as QA Engineer
    participant System as KS-PMT Platform (API & DB)
    participant S3 as AWS S3 Storage
    participant FCM as Push Notification (FCM)

    Admin->>System: 1. Setup Branch, Departments, Users & Dynamic RBAC
    Admin->>System: 2. Create Clients, Products, Projects & Versions
    PM->>System: 3. Create Task (Multi-assignees, Dates, Estimated Hrs, Chargeable)
    System->>FCM: 4. Queue notification (provider acceptance pending)
    FCM->>Dev: 5. Target push/in-app delivery
    Dev->>System: 6. Start Work: Update Status to WIP, Start Live Timer
    Dev->>S3: 7. Direct Upload code diff / screenshot attachment
    Dev->>System: 8. Complete work: Log 3.5 hrs & move to "Pending for Testing"
    System->>System: 9. Auto-Assignment Rule routes task to QA
    System->>FCM: 10. Notify QA Engineer
    QA->>System: 11. Record QA result; client acceptance is a separate step
```

---

## 2. Step-by-Step User Journeys

### 2.1 Super Admin: Organizational & Security Setup

1. **Branch & Location Configuration**:
   - Navigate to **Settings > Branches**.
   - Create locations (e.g., *Head Office - Ahmedabad*, *Dev Center - Bengaluru*, *Regional Office - Mumbai*).
   - Enter geographic coordinates (Latitude, Longitude) and geofencing radius (e.g., 200 meters) used for mobile attendance or field visit verification.
2. **Departments & Designations**:
   - Define corporate departments: *Engineering*, *QA*, *DevOps*, *UI/UX*, *Support*, *Sales*.
   - Define designations with ranking levels (e.g., *Junior Developer (1)*, *Senior Developer (3)*, *Tech Lead (5)*, *Engineering Manager (7)*).
3. **User / Employee Provisioning**:
   - Navigate to **Users > Add Employee**. (No public registration exists; accounts are created by HR/Admin).
   - Input official email, mobile number, primary branch, department, designation, and reporting manager.
   - Choose login mode permissions (Password enabled, Mobile OTP enabled).
4. **Dynamic RBAC & Permission Overrides**:
   - Assign a base role (e.g., *Software Engineer*).
   - **Branch Override Example**: In *Branch B*, restrict financial amounts from being viewed even if the base role has read access.
   - **User Override Example**: Grant an individual senior developer explicit access to view client contract values without promoting them to Project Manager.

---

### 2.2 Product & Project Portfolio Setup

1. **Proprietary Products Setup**:
   - Navigate to **Products > Add Product**.
   - Enter details: Product Name (e.g., *KashCare Health ERP*), Code, Category, Production Version.
   - Setup commercial terms: Base License Fee, AMC percentage (e.g., 18% annually), Implementation charges.
   - Map existing clients who have purchased the product with their license type (SaaS / On-Premise) and AMC renewal dates.
2. **Custom Projects Setup**:
   - Navigate to **Projects > Add Project**.
   - Select Client (or convert an existing Prospect).
   - Select Branch and assign Project Manager.
   - Set Commercials: Contract Value (e.g., $45,000 USD), Billing Model (Fixed Cost or T&M hourly rate), Budgeted Hours (e.g., 600 hrs).
   - Allocate team members with start/end dates and allocation percentages.
3. **Version & Milestone Planning**:
   - Create product/project releases (e.g., `v1.2.0`) and separately plan sprint timeboxes (e.g., Sprint 4). A task can target both; sprint completion does not release a version.
   - Define Target Release Date, Planned Start Date, and Release Notes.
   - Link tasks and bugs to the release and independently to the sprint; retain original commitment and rollover history (PLAN-001).

---

### 2.3 Dynamic Task Workflows & Auto-Assignment

1. **Configuring Dynamic Task Types**:
   - Go to **Settings > Task Types**.
   - Standard types available: `New Development`, `Bug`, `Issue`, `Enhancement`, `Training`, `Support Ticket`.
   - Configure workflow progression:
     - For `New Development`: `Open` -> `WIP` -> `Pending for Code Review` -> `Pending for Testing` -> `Testing` -> `Pending for Deployment` -> `Closed`.
     - For `Support Ticket`: `Open` -> `Under Investigation` -> `Client Feedback` -> `Resolved` -> `Closed`.
2. **Setting Up Auto-Assignment Rules**:
   - Rule 1 (On Creation): If Task Type = `Support Ticket`, auto-assign to designated Support Tier 1 engineer in the associated branch.
   - Rule 2 (On Status Transition): When any task moves to `Pending for Testing`, auto-reassign to the project's Lead QA Engineer.
   - Rule 3 (On Status Transition): When task is ready for UAT, notify the PM or designated client-review coordinator. No deployment automation is implied.

---

### 2.4 Daily Workflow: Project Manager & Developers

1. **Task Creation**:
   - Open Project or Product workspace -> Click **New Task**.
   - Enter Title, Description, Priority (`High`), Task Type (`Bug`), Version (`v1.2.0`).
   - Assign to **multiple developers** (e.g., Lead Dev + Junior Dev).
   - Set Planned Start Date, Planned End Date, and Estimated Hours (e.g., 12.0 hrs).
   - For an out-of-scope request, prepare a change quotation with cost/date impact and obtain authorized client approval of that revision (CLIENT-004) before treating it as approved billable scope; the task chargeable flag alone is not approval.
   - Break down into **Subtasks** (e.g., *1. Database Migration*, *2. API Endpoint*, *3. Unit Tests*).
2. **Developer Execution (Web & Mobile)**:
   - Developer logs in via **Email + Password** or **Mobile + OTP**.
   - Views personal dashboard with assigned tasks sorted by priority and due date.
   - Moves task status from `Open` to `WIP`.
   - Clicks **Start Timer** or manually logs work hours (e.g., 4.5 hrs billable) with a summary of accomplishments.
   - Adds comments and attaches error logs or screenshots. Files are securely uploaded directly to **AWS S3** via backend pre-signed URLs.
   - Upon completion, moves task to `Pending for Testing`.
3. **QA Verification**:
   - QA receives an immediate push notification and in-app alert.
   - Tests the build against task acceptance criteria.
   - If a defect is found: Adds comment with attached screen recording, and moves status to `Reopened`.
   - If verified: Records QA completion and prepares shared UAT evidence where client acceptance is required; only the authorized client decision records sign-off.

---

## 3. Mobile Application Walkthrough (Android & iOS)

### 3.1 Authentication & First Launch

- Launch mobile app -> Choose between **Email / Password** or **Mobile Number / OTP**.
- On Mobile OTP: Enter 10-digit number -> receive 6-digit SMS OTP -> auto-read / enter -> authenticated.
- Prompt for Camera, File Storage, Geolocation, and Push Notification permissions.

### 3.2 GPS Location Access & Branch Verification

- When an employee opens the app or logs a field visit / on-site task, the mobile app captures the current device GPS coordinates (Latitude & Longitude).
- The app checks proximity against the assigned office branch geofence radius.
- If within the geofence, the status displays **"Within Branch Location"**; for field engineers, the actual coordinates are tagged with the activity log.

### 3.3 Camera Capture & Direct AWS S3 Upload

1. Open any task -> Tap **"Add Attachment"**.
2. Options: **Take Photo (Camera)** or **Pick Document/Image (Gallery/Files)**.
3. Upon capture, the app compresses the image locally to optimize bandwidth.
4. The app requests a pre-signed PUT URL from the backend REST API: `POST /api/v1/attachments/presigned-upload-url`.
5. The mobile app uploads the binary payload directly to **AWS S3**.
6. The app confirms successful upload by calling the backend to register the attachment record with the task.

### 3.4 Push Notifications & Quick Actions

- Real-time push alerts via **Firebase Cloud Messaging (FCM)** for:
  - New task assignment.
  - Mention in a comment (`@employee`).
  - Critical bug raised in an assigned project.
- Tapping the notification deep-links directly to the Task Detail view.

---

## 4. REST API Integration Guide

### 4.1 Base URL & Security Headers

All external and client integrations interact with the versioned REST API.

- **Base URL**: `https://api.ks-pmt.kashvirainfotech.com/api/v1`
- **Required Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  Accept: application/json
  ```

### 4.2 Sample API Interactions

#### 1. Mobile OTP Authentication

```bash
# Step 1: Request OTP
curl -X POST https://api.ks-pmt.kashvirainfotech.com/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile_number": "+919876543210"}'

# Step 2: Verify OTP and Obtain Tokens
curl -X POST https://api.ks-pmt.kashvirainfotech.com/api/v1/auth/login-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile_number": "+919876543210", "otp": "482910"}'
```

#### 2. Create Task with Multi-Assignees & Chargeable Amount

```bash
curl -X POST https://api.ks-pmt.kashvirainfotech.com/api/v1/tasks \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "version_id": "a5e8c142-83fc-4b5b-8012-32a8cb981e11",
    "task_type_id": "e4b2d184-7832-411a-8c77-47b8ef3a7210",
    "title": "Implement Stripe Payment Webhook Handling",
    "description": "Handle customer.subscription.updated and failed payment events.",
    "priority": "High",
    "planned_start_date": "2026-10-01T09:00:00Z",
    "planned_end_date": "2026-10-05T18:00:00Z",
    "estimated_hours": 16.0,
    "is_chargeable": true,
    "charge_amount": 800.00,
    "assignee_ids": [
      "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "f9e8d7c6-b5a4-3210-fedc-ba9876543210"
    ]
  }'
```

#### 3. Request AWS S3 Pre-signed Upload URL

```bash
curl -X POST https://api.ks-pmt.kashvirainfotech.com/api/v1/attachments/presigned-upload-url \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "TASK",
    "entity_id": "4a123bc4-56de-78fa-90bc-def123456789",
    "file_name": "bug_reproduction_screen.png",
    "mime_type": "image/png",
    "file_size": 245890
  }'
```
**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "attachment_id": "890fa123-bc45-67de-f890-bcdef1234567",
    "upload_url": "https://ks-pmt-attachments.s3.amazonaws.com/tasks/4a123bc4/bug_reproduction_screen.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
    "s3_key": "tasks/4a123bc4/bug_reproduction_screen.png",
    "expires_in_seconds": 900
  }
}
```

---

## 5. Audit & Activity Tracking Inspection

Every critical operation is logged automatically. Administrators can review the audit log via the web UI or API (`GET /api/v1/audit-logs`):

```json
{
  "id": "e3a8910b-1234-4567-890a-bcdef1234567",
  "entity_name": "tasks",
  "record_id": "4a123bc4-56de-78fa-90bc-def123456789",
  "action_type": "STATUS_UPDATE",
  "old_values": {
    "status": "WIP",
    "actual_end_date": null
  },
  "new_values": {
    "status": "Pending for Testing",
    "actual_end_date": "2026-10-04T17:30:00Z"
  },
  "performed_by": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "ip_address": "122.179.84.12",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "location": "Ahmedabad, India",
  "created_at": "2026-10-04T17:30:15Z"
}
```


## 6. Planned Client Delivery Journey

These steps implement CLIENT-001–006 and DEL-001 in increments A–C; they are planned, not current portal functionality.

1. **Invite and scope access:** An authorized administrator invites a client contact, assigns project/product-community access and grants approval authority separately if required. No public registration. Client admins cannot manage employee roles.
2. **Submit privately:** The client reports a bug/support need/change with context and S3 evidence. Only that client and authorized internal staff can see the source request. A shared product license does not reveal other customers' tickets.
3. **Triage and clarify:** The team requests information, links a duplicate or accepts/declines with a reason. Acceptance links delivery work; it promises neither additional price nor a date. Several private tickets may link to the same internal defect.
4. **Agree scope:** The PM publishes a requirement baseline with acceptance criteria. For extra work, the client approver reviews a specific change revision containing effort, quotation and date impact. Approval is recorded; material edits require reapproval.
5. **Develop and verify:** The team plans tasks/sprint/release independently, logs effort and records QA evidence. The client sees only published progress and shared artifacts. A developer's completed task is not a client acceptance decision.
6. **Perform UAT:** The PM/QA publishes a versioned UAT package. The authorized client approver chooses Approve, Request changes or Reject. Failed criteria link defects; revised packages need new decisions and preserve the previous history.
7. **Communicate and close:** PM-reviewed updates show delivered/next work, risks, client decisions needed and target versus committed dates. Record accepted milestone and client-specific installed/accepted version manually. Contract terms determine historical read-only rights and future submission rights after closeout or AMC expiry.

Example: the client approves change revision 3 for an agreed price and date. Updating either material term creates revision 4 awaiting approval; a newer progress report cannot silently replace revision 3's commitment.

## 7. Planned Product Feedback and Outcome Journey

1. An entitled customer submits private evidence of a problem; a product manager moderates a sanitized idea for the authenticated product community (PROD-001).
2. Designated organization voting representatives cast/retract one organizational vote. Optional impact statements, identities and commercial weighting remain internal. Followers receive eligible updates independently of voting.
3. Duplicate ideas merge without counting an organization twice or exposing source conversations. The product manager considers customer evidence, reach/impact/confidence/effort and strategy, then records a decision and rationale.
4. Publish Now / Next / Later or an explicitly indicative release target. Deferred/declined/merged outcomes remain visible where appropriate; votes do not create a delivery commitment.
5. Link selected ideas to epics/tasks, manual QA and a release-readiness review. Publish only approved customer changelogs. Release availability does not imply installation at an on-premise client.
6. Review the linked goal against its baseline/target and record actual customer feedback or manually entered outcome measures (PROD-002).

## 8. Planned Team Planning and Timesheet Journey

- PLAN-001/002: Rank the product/project backlog, record a sprint goal/commitment, retain scope changes and close with explicit rollover. Track blocker episodes separately from workflow status with an owner and next action.
- PLAN-003: Save My work, Awaiting QA, Awaiting client and Blocked views; inline/bulk edits still enforce each task's permissions, workflow and revision.
- TIME-001: Log manual time or switch a single durable timer across tasks. Working in an IDE does not pause time on browser blur. Submit a week using the configured calendar; authorized project reviewers approve their portions before the period is fully approved.
- A four-day 32-hour week with eight hours approved absence expects 24 loggable hours. Reserved mentoring time affects delivery availability without making the employee's work unproductive.
- Approved worklog amendments require audited reapproval. Retainer/AMC usage consumes eligible approved hours once and routes overages through the change-approval journey (COMM-001).
- CLIENT-006 and ANALYTICS-001–004: Read narrative health and explainable risk alerts first. Capacity/flow/budget charts disclose missing data, sample sizes and baseline choices; no automatic employee leaderboard is generated.
