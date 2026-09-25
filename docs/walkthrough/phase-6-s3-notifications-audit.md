# Walkthrough: Phase 6 - Cloud Storage (AWS S3), Real-Time Notifications & Audit Trail

## 1. Overview
In **Phase 6**, we completed the cloud infrastructure, enterprise notifications, and central security auditing layers for KS-PMT (Kashvira Solutions - Project & Product Management Tool):
1. **Cloud File Storage (AWS S3)**: Direct-to-S3 secure pre-signed PUT/GET URL architecture eliminating server memory and bandwidth bottlenecks.
2. **Push & In-App Notifications**: Support for user notification queries, unread badge counters, read receipts, and cross-platform push token registration for Android, iOS, and Web.
3. **Central Audit Trail**: Tamper-evident activity logging for compliance, tracking user actions, entity modifications (old vs. new values), IP addresses, user agents, platforms, and GPS coordinates.

---

## 2. Implemented Modules & Architecture

### 2.1 Cloud Storage Architecture (`server/src/modules/attachments`)
- **Direct S3 Pre-Signed Upload**:
  - `POST /api/v1/attachments/presigned-upload-url`: Computes a unique S3 key (`uploads/{entityType}/{uuid}_{filename}`) and returns an AWS S3 pre-signed `PUT` URL valid for 15 minutes.
  - Client uploads the raw binary file directly to S3.
  - `POST /api/v1/attachments/confirm-upload`: Persists file metadata in the `attachments` table with mime type, file size, original file name, S3 bucket, and S3 key.
- **Secure Download & Access**:
  - `GET /api/v1/attachments/:id/presigned-download-url`: Generates a time-limited pre-signed `GET` URL for safe client downloads without making S3 buckets public.
- **Entity Linking & Soft Deletion**:
  - `GET /api/v1/attachments/entity/:type/:id`: Fetches all active attachments linked to a task, project, comment, or user avatar.
  - `DELETE /api/v1/attachments/:id`: Soft-deletes attachment metadata and marks it inactive.

### 2.2 Notifications & Push Engine (`server/src/modules/notifications`)
- **Push Device Registration**:
  - `POST /api/v1/notifications/push-token`: Upserts device tokens for FCM push alerts (`ANDROID`, `IOS`, `WEB`) mapped to `user_push_tokens`.
  - `DELETE /api/v1/notifications/push-token`: Deactivates push tokens upon logout or notification toggle.
- **User Notifications & Read Receipts**:
  - `GET /api/v1/notifications`: Paginated notifications for the logged-in user with filters for read/unread state and notification type.
  - `GET /api/v1/notifications/unread-count`: Returns the immediate unread badge count for UI navigation headers.
  - `PATCH /api/v1/notifications/:id/read`: Marks a specific notification as read with a timestamp.
  - `PATCH /api/v1/notifications/read-all`: Batch marks all notifications as read.
- **Notification Dispatch Helper**:
  - `NotificationsService.createNotification()`: Stores the in-app notification and dispatches push alerts to registered mobile and web devices.

### 2.3 Central Audit Trail Engine (`server/src/modules/audit-logs`)
- **Resilient Logging Service**:
  - `AuditLogsService.log()`: Records user ID, action type (`TASK_CREATED`, `STATUS_CHANGED`, `LOGIN_SUCCESS`, etc.), entity name, record ID, JSONB snapshots (`old_values`, `new_values`), IP address, user agent, platform, and GPS coordinates.
  - Enclosed in non-blocking error handling to ensure mission-critical user workflows never fail if auditing encounters any storage exceptions.
- **Auditing Controller with Dynamic RBAC**:
  - `GET /api/v1/audit-logs`: Protected with `AUDIT_LOGS:VIEW` permission. Supports multi-parameter filtering (`userId`, `actionType`, `entityName`, `startDate`, `endDate`, `devicePlatform`) with pagination and user profile joins.
  - `GET /api/v1/audit-logs/:id`: Inspects granular change records with before/after state diffs.

---

## 3. Database Updates
In accordance with KS-PMT cumulative database maintenance guidelines:
- Appended `AUDIT_LOGS:VIEW` and `NOTIFICATIONS:MANAGE` system permissions to [inserts.sql](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql) with standardized datetime comment headers.
- Mapped new permissions to `ROLE_SUPER_ADMIN`.
- **Zero direct database migrations executed**; scripts remain static for human review and deployment.

---

## 4. Verification & Testing
- Ran `npm run build` in `server/`.
- Verified 0 TypeScript compilation errors.
- Checked off Phase 3.6 and 3.7 items in [docs/tasks-checklist.md](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/tasks-checklist.md).
