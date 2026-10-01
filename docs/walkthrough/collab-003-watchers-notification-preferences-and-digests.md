# COLLAB-003 Walkthrough: Work Item Watchers, Notification Preferences & Reliable Deduplicated Digest Delivery

**Date**: 2026-10-01  
**Module**: COLLAB-003 (`Tier D` / `Increment D`)  
**Status**: Completed & Verified  

---

## 1. Executive Summary

COLLAB-003 introduces an enterprise-grade notification engine, independent followers and work item watchers, user-level notification preferences with quiet hours windowing, deduplicated delivery queues, and a scheduled digest consolidation engine with authorization re-checking at dispatch time.

### Key Capabilities Delivered:
1. **Independent Work Item Watchers & Followers**:
   - Internal employees and external client contacts can follow Tasks, Knowledge Documents (`COLLAB-001`), Product Roadmap Ideas (`PROD-001`), Change Requests (`CLIENT-004`), and Client UAT Packages (`CLIENT-005`).
   - Granular triggers per watcher: status transitions, comments/replies, file attachments, and approvals.
   - Follow relationships are decoupled from assignments, authorship, or voting.
2. **Granular Notification Preferences & Quiet Hours**:
   - Multi-channel delivery toggles: In-App notification center, Email alerts, and Mobile/Web push.
   - Digest consolidation mode: `INSTANT` (immediate dispatch), `DAILY` (daily briefing), and `WEEKLY` (executive recap).
   - Quiet Hours windowing: customizable time range (e.g. 22:00 to 07:00), recipient timezone awareness, and an **urgent bypass rule** for P1 blockers, critical production defects, and urgent signoffs.
   - Granular event preferences: toggles across 8 distinct event categories (`TASK_ASSIGNMENT`, `STATUS_CHANGE`, `COMMENT_AND_MENTION`, `BLOCKER_AND_DEPENDENCY`, `DOCUMENT_REVISION`, `APPROVAL_AND_SIGNOFF`, `DEADLINE_AND_SLA`, `RECURRING_WORK_RUN`).
3. **Reliable Queue, Deduplication & Authorization Re-check Engine**:
   - Guaranteed single-delivery via unique deduplication keys (`deduplication_key`), preventing duplicate alerts on system retries or simultaneous state changes.
   - **Authorization re-check at dispatch time**: Before delivering alerts or digests, the system validates that the recipient still has access to the target entity (e.g. inactive accounts or revoked access are flagged as `CANCELLED_UNAUTHORIZED` rather than leaking private data).
   - Live digest briefing preview consolidating pending digest items for the recipient.

---

## 2. Database Artifacts (`dbscripts/`)

In compliance with project database management guidelines, canonical definitions were updated in place without accumulating ad-hoc migration scripts. Direct database execution was strictly avoided.

### Canonical Schema Additions (`dbscripts/tables/tables.sql`)
1. **Table 78: `work_item_watchers`**:
   - Tracks subscriptions for internal users (`user_id`) or external client contacts (`client_contact_id`).
   - Guarded by check constraint `chk_watcher_actor` and unique indexes ensuring single subscription per actor per entity.
   - Toggles: `notify_on_status_change`, `notify_on_comments`, `notify_on_attachments`, `notify_on_approvals`.
   - Audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`).
2. **Table 79: `user_notification_settings`**:
   - User-specific notification preferences: `email_notifications_enabled`, `in_app_notifications_enabled`, `push_notifications_enabled`.
   - `digest_mode`: `INSTANT`, `DAILY`, `WEEKLY`.
   - `quiet_hours_enabled`, `quiet_hours_start`, `quiet_hours_end`, `timezone`, `allow_urgent_during_quiet_hours`.
   - `event_preferences` (`JSONB` mapping of 8 event categories).
3. **Table 80: `notification_delivery_queue`**:
   - `deduplication_key` (`VARCHAR(255) UNIQUE NOT NULL`).
   - Recipient references: `recipient_user_id`, `recipient_contact_id`.
   - Delivery channels: `IN_APP`, `EMAIL`, `PUSH`.
   - Delivery statuses: `QUEUED`, `DIGEST_PENDING`, `SENT`, `FAILED`, `CANCELLED_UNAUTHORIZED`, `SUPPRESSED_QUIET_HOURS`.
   - Scheduling & delivery timestamps: `scheduled_for`, `delivered_at`.

### Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_watchers_entity` on `(entity_type, entity_id)`
- `idx_watchers_user` on `(user_id)`
- `idx_watchers_contact` on `(client_contact_id)`
- `idx_notif_settings_user` on `(user_id)`
- `idx_notif_settings_digest` on `(digest_mode)`
- `idx_notif_queue_status` on `(delivery_status, scheduled_for)`
- `idx_notif_queue_user` on `(recipient_user_id)`
- `idx_notif_queue_entity` on `(entity_type, entity_id)`

### Permissions & Seed Inserts (`dbscripts/inserts/inserts.sql`)
- Permissions added:
  - `NOTIFICATIONS:PREFERENCES`: Manage user preferences, quiet hours, and digest subscriptions.
  - `NOTIFICATIONS:WATCH`: Follow or unfollow work items and inspect watchers.
  - `NOTIFICATIONS:DISPATCH_QUEUE`: Monitor deduplicated queue and trigger batch dispatch.
- Mapped dynamically to Super Admin, Project Manager, Developer, QA Tester, Branch Manager, and Support Executive roles.
- Sample data appended in `dbscripts/inserts/sample_data.sql`: sample user settings (instant vs daily digest, quiet hours), watchers across tasks/docs/ideas, and sample deduplicated queue items.

### Installer Verification
- Executed `node dbscripts/build-install.mjs` and verified with `node --test dbscripts/build-install.test.mjs` (all 2 bundle test suites passed 100%).

---

## 3. Backend Implementation (`server/src/modules/notifications/`)

### DTOs
- `dto/notification-settings.dto.ts`: Validates channel flags, digest mode (`INSTANT`, `DAILY`, `WEEKLY`), quiet hours timestamps, timezone, and JSON event preferences.
- `dto/watcher.dto.ts`: Validates entity type (`TASK`, `KNOWLEDGE_DOC`, `PRODUCT_IDEA`, `CHANGE_REQUEST`, `UAT_PACKAGE`), entity UUID, and notification trigger checkboxes.
- `dto/queue.dto.ts`: Validates deduplication key, event category, channel, urgency, and query filters.

### Service Layer (`notifications.service.ts`)
- `getSettings(userId)` & `updateSettings(userId, dto)`: Upsert user preferences with fallback sensible corporate defaults.
- `watchEntity(userId, dto)` & `unwatchEntity(userId, dto)`: Manage watcher subscriptions.
- `getEntityWatchers(entityType, entityId)` & `getMyWatchedItems(userId)`: Query subscribed work items with resolved metadata.
- `enqueueNotification(actorUserId, dto)`:
  - Validates `deduplication_key` against existing records (returns existing on conflict without crashing).
  - Checks recipient event preferences and digest mode (automatically sets non-urgent items to `DIGEST_PENDING` if recipient is on daily/weekly mode).
- `processDeliveryQueue(actorUserId)`:
  - **Authorization Re-check Engine**: Re-evaluates recipient active status and entity visibility right before delivery. Marks invalid or revoked recipients as `CANCELLED_UNAUTHORIZED` to prevent security leakage.
  - **Quiet Hours Check**: Evaluates local time window and urgent bypass flags. Defers delivery or marks `SUPPRESSED_QUIET_HOURS`.
  - Dispatches authorized items to `notifications` table and marks queue status as `SENT`.
- `previewDigest(userId)`: Bundles pending digest items grouped by event category.

### Controller Endpoints (`notifications.controller.ts`)
- `GET /notifications/settings`: Retrieve current user settings (`NOTIFICATIONS:PREFERENCES`)
- `PUT /notifications/settings`: Update settings (`NOTIFICATIONS:PREFERENCES`)
- `POST /notifications/watchers/watch`: Follow work item (`NOTIFICATIONS:WATCH`)
- `POST /notifications/watchers/unwatch`: Unfollow work item (`NOTIFICATIONS:WATCH`)
- `GET /notifications/watchers/entity/:entityType/:entityId`: List item watchers (`NOTIFICATIONS:WATCH`)
- `GET /notifications/watchers/my`: List my watched work items (`NOTIFICATIONS:WATCH`)
- `POST /notifications/queue/enqueue`: Enqueue notification with deduplication key (`NOTIFICATIONS:DISPATCH_QUEUE`)
- `POST /notifications/queue/dispatch`: Process due items and recheck authorization (`NOTIFICATIONS:DISPATCH_QUEUE`)
- `GET /notifications/queue`: Inspect queue items and statuses (`NOTIFICATIONS:DISPATCH_QUEUE`)
- `GET /notifications/digest/preview`: Preview pending digest briefing summary (`NOTIFICATIONS:PREFERENCES`)

---

## 4. Frontend Implementation (`web/`)

### TypeScript Interfaces (`web/src/types/index.ts`)
- `UserNotificationSettings`: Channel flags, digest cadence, quiet hours start/end, timezone, urgent bypass, and event preferences map.
- `WorkItemWatcher`: Watcher registry with entity type, item title/code, and trigger flags.
- `NotificationQueueItem`: Queue item with deduplication key, delivery channel, status badge, and timestamps.
- `DigestPreviewResponse`: Consolidated digest category structure.

### API Client (`web/src/api/endpoints.ts`)
- Extended `notificationsApi` with `getSettings`, `updateSettings`, `watch`, `unwatch`, `getEntityWatchers`, `getMyWatchedItems`, `enqueue`, `dispatchQueue`, `getQueue`, and `previewDigest`.

### Workspace Component (`web/src/components/notifications/NotificationsWorkspaceView.tsx`)
- Tabbed interface embedded into `/notifications` route:
  1. **Inbox & Alerts Tab**: View unread and historical notifications, mark individual or all as read, ref link to source entity.
  2. **Preferences & Quiet Hours Tab**: Toggle channels (In-App, Email, Push), select digest cadence (`INSTANT`, `DAILY`, `WEEKLY`), configure Quiet Hours window with urgent bypass, and customize 8 granular event category preferences.
  3. **Watched Work Items Tab**: Grid of all work items followed by user across tasks, docs, and ideas with trigger toggles, unwatch action, and quick "Follow Work Item" modal.
  4. **Digest & Delivery Queue Tab**: Live preview of bundled digest items and delivery queue monitor with a one-click **"Dispatch Due Queue Items & Re-check Auth"** action button.

---

## 5. Verification Results

1. **Database Schema & Install Test**:
   - `node dbscripts/build-install.mjs` generated bundle from 15 object files.
   - `node --test dbscripts/build-install.test.mjs`: 2/2 tests passed.
2. **Backend Compilation**:
   - `npm run build` in `server/` completed with exit code `0`.
3. **Frontend Compilation**:
   - `npm run build` in `web/` (`tsc && vite build`) completed with exit code `0`.
4. **Task Checklist**:
   - Marked `COLLAB-003` as completed in `docs/tasks-checklist.md`.
