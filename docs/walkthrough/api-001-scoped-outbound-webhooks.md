# Walkthrough: API-001 Scoped Outbound Webhooks & Event Integration

**Date**: 2026-10-01  
**Module**: `API-001` (Scoped Outbound Webhooks & Event Integration)  
**Status**: Completed & Verified  

---

## 1. Overview & Objective

`API-001` introduces an enterprise-grade outbound webhook and event notification distribution engine to KS-PMT. It allows authorized administrators and project managers to register third-party endpoints (e.g. Slack bots, ERP/Accounting integrations, Zapier, CI/CD runners) that receive signed, real-time HTTP POST notifications whenever critical project management events occur.

### Measurement Contract & Acceptance Criteria
1. **Allowlisted Event Types**: Subscriptions can register for specific events (`task.created`, `task.transitioned`, `task.assigned`, `blocker.opened`, `blocker.resolved`, `release.published`, `sla.breached`, `cr.approved`, `uat.accepted`, `milestone.completed`).
2. **Cryptographic HMAC-SHA256 Signatures**: Outbound requests include `X-PMT-Signature: t={timestamp},v1={hex_digest}` computed over `t.{raw_payload}` to prevent payload tampering and replay attacks.
3. **Graceful Secret Rotation**: Supports zero-downtime secret rotation preserving `previous_secret_key` and recording `secret_rotated_at`.
4. **Strict Destination SSRF Protection**: Outbound destinations are strictly validated to block loopback addresses (`127.0.0.1`, `localhost`), private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata services (`169.254.169.254`, `metadata.google.internal`).
5. **Bounded Exponential Backoff Retries & Delivery Ledger**: Failed deliveries are automatically retried with exponential backoff (+60s, +300s, +900s) up to `max_retries`. Every attempt logs execution latency, HTTP status code, request payload, and truncated response body, with 1-click manual replay (`WEBHOOKS:REPLAY`).

---

## 2. Database Schema & Static Installer

Following the development blank-database policy in `AGENTS.md`, table definitions were added canonically to `dbscripts/tables/tables.sql` without migration history.

### Canonical Tables Added
1. **Table 114: `webhook_subscriptions`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `subscription_code VARCHAR(50) NOT NULL UNIQUE`
   - `name VARCHAR(150) NOT NULL`
   - `target_url VARCHAR(1000) NOT NULL`
   - `secret_key VARCHAR(255) NOT NULL`
   - `previous_secret_key VARCHAR(255)`
   - `secret_rotated_at TIMESTAMP WITH TIME ZONE`
   - `event_types TEXT[] NOT NULL`
   - `scope_project_ids UUID[]`
   - `is_enabled BOOLEAN DEFAULT TRUE NOT NULL`
   - `max_retries INTEGER DEFAULT 3 NOT NULL`
   - `timeout_seconds INTEGER DEFAULT 10 NOT NULL`
   - `custom_headers JSONB DEFAULT '{}'::jsonb NOT NULL`
   - `description TEXT`
   - Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

2. **Table 115: `webhook_deliveries`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE`
   - `event_id VARCHAR(100) NOT NULL`
   - `event_type VARCHAR(100) NOT NULL`
   - `payload JSONB NOT NULL`
   - `destination_url VARCHAR(1000) NOT NULL`
   - `attempt_number INTEGER DEFAULT 1 NOT NULL`
   - `max_attempts INTEGER DEFAULT 3 NOT NULL`
   - `status VARCHAR(30) DEFAULT 'PENDING' NOT NULL` (`PENDING`, `SUCCESS`, `RETRYING`, `FAILED`, `MANUAL_REPLAY`)
   - `response_status_code INTEGER`
   - `response_headers JSONB`
   - `response_body TEXT`
   - `execution_duration_ms INTEGER`
   - `error_message TEXT`
   - `next_retry_at TIMESTAMP WITH TIME ZONE`
   - `delivered_at TIMESTAMP WITH TIME ZONE`
   - Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

### Performance Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_webhooks_code`: `webhook_subscriptions(subscription_code)`
- `idx_webhooks_enabled`: `webhook_subscriptions(is_enabled, is_active)`
- `idx_webhook_deliv_sub`: `webhook_deliveries(subscription_id)`
- `idx_webhook_deliv_event`: `webhook_deliveries(event_id, event_type)`
- `idx_webhook_deliv_retry`: `webhook_deliveries(status, next_retry_at)`
- `idx_webhook_deliv_created`: `webhook_deliveries(created_at DESC)`

### RBAC Permissions (`dbscripts/inserts/inserts.sql`)
- `WEBHOOKS:READ`: View webhook subscriptions and delivery audit logs
- `WEBHOOKS:MANAGE`: Create, update, rotate secrets, and delete webhook subscriptions
- `WEBHOOKS:REPLAY`: Manually re-trigger failed delivery attempts from the ledger
- Mapped to roles `SUPER_ADMIN`, `PROJECT_MANAGER`, and `BRANCH_MANAGER`.

### Seed Sample Data (`dbscripts/inserts/sample_data.sql`)
- Seed subscription `WH-SLACK-001` (Slack Delivery Alerts)
- Seed subscription `WH-ERP-002` (ERP Milestone Billing Sync)
- Seed delivery ledger records demonstrating `SUCCESS` (200 OK) and `RETRYING` states.

---

## 3. Backend Engine Implementation

### 3.1 SSRF Validator (`server/src/modules/webhooks/ssrf-validator.ts`)
Validates that destination URLs:
- Use standard HTTP or HTTPS protocols.
- Do not resolve to loopback hostnames (`localhost`, `127.0.0.1`, `::1`).
- Do not target private RFC 1918 CIDR blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`).
- Do not attempt to read cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).

### 3.2 Cryptographic Signer (`server/src/modules/webhooks/webhook-signer.ts`)
- `generateWebhookSecret()`: Produces cryptographically secure `whsec_...` random hex keys.
- `computeWebhookSignature(secret, timestamp, payload)`: Computes `v1={hex_digest}` HMAC-SHA256 signature using `t.{stringified_payload}` to prevent replay attacks and body tampering.

### 3.3 Webhooks Service (`server/src/modules/webhooks/webhooks.service.ts`)
- `getSubscriptions(query)` & `getSubscriptionById(id)`: Filtered listing with masked secrets and aggregate delivery statistics.
- `createSubscription(dto, userId)`: Validates SSRF, generates rotatable signing secret, and creates subscription.
- `updateSubscription(id, dto, userId)`: Updates destination, event types, retries, and timeout parameters.
- `rotateSecret(id, userId)`: Preserves old secret in `previous_secret_key` and marks `secret_rotated_at`.
- `deleteSubscription(id, userId)`: Soft-deletes subscription.
- `dispatchEvent(eventType, eventData, projectId)`: Dispatches payload asynchronously to all matching active subscriptions.
- `executeDelivery(deliveryId, sub, payload, attempt)`: HTTP dispatch with `AbortController` timeout, headers (`X-PMT-Signature`, `X-PMT-Event-Id`, `X-PMT-Delivery-Id`), latency calculation, and exponential backoff retry scheduling.
- `replayDelivery(deliveryId, userId)`: 1-click manual redelivery with incremented attempt counter.
- `simulateEvent(dto, userId)`: Synthetic event dispatch for integration testing.
- `getDeliveries(query)`: Delivery ledger queries with subscription and status filtering.

### 3.4 Webhooks Controller (`server/src/modules/webhooks/webhooks.controller.ts`)
Exposes REST endpoints guarded by `JwtAuthGuard` and `DynamicRbacGuard`:
- `GET /api/webhooks/subscriptions` (`WEBHOOKS:READ`)
- `GET /api/webhooks/subscriptions/:id` (`WEBHOOKS:READ`)
- `POST /api/webhooks/subscriptions` (`WEBHOOKS:MANAGE`)
- `PATCH /api/webhooks/subscriptions/:id` (`WEBHOOKS:MANAGE`)
- `DELETE /api/webhooks/subscriptions/:id` (`WEBHOOKS:MANAGE`)
- `POST /api/webhooks/subscriptions/:id/rotate-secret` (`WEBHOOKS:MANAGE`)
- `POST /api/webhooks/simulate` (`WEBHOOKS:MANAGE`)
- `GET /api/webhooks/deliveries` (`WEBHOOKS:READ`)
- `POST /api/webhooks/deliveries/:id/replay` (`WEBHOOKS:REPLAY`)

Registered `WebhooksModule` in `server/src/app.module.ts`.

---

## 4. Frontend Web Implementation

### 4.1 Types & API Client
- Added `WebhookSubscription` and `WebhookDelivery` interfaces to `web/src/types/index.ts`.
- Exported `webhooksApi` in `web/src/api/endpoints.ts` with all subscription management, delivery query, secret rotation, simulation, and replay methods.

### 4.2 Webhooks Workspace Component (`web/src/components/webhooks/WebhooksWorkspace.tsx`)
A comprehensive tabbed administrative and operational interface:
1. **Subscriptions Tab**:
   - Card listing with subscription code, target URL, active status toggle, and event badges.
   - Secret key rotation action with modal confirmation.
   - Edit / Delete actions with confirmation guards.
2. **Delivery Ledger Tab**:
   - Real-time audit log of all outbound deliveries.
   - Status chips (`SUCCESS`, `RETRYING`, `FAILED`, `MANUAL_REPLAY`).
   - Latency in milliseconds and HTTP status codes.
   - **Inspect Modal**: View exact JSON payload sent, response headers, response body snippet, and error message.
   - **1-Click Replay**: Re-trigger any previous delivery directly from the ledger.
3. **Test Simulator & Security Spec Tab**:
   - Interactive console allowing PMs to dispatch sample events to subscribed endpoints.
   - Live payload preview and instantaneous feedback.
   - Security specification detailing HMAC-SHA256 signature scheme, SSRF destination rules, and retry schedule.
4. **New / Edit Subscription Modal**:
   - Full configuration for target URL, event multi-select, retry limits, and timeout.
   - Post-creation secret key reveal alert with 1-click clipboard copy.

### 4.3 Routing & Navigation
- Added route `/webhooks` inside `web/src/App.tsx`.
- Added sidebar navigation entry with `Webhook` icon under the Workspace category in `web/src/components/layout/Sidebar.tsx`.

---

## 5. Build & Validation Results

1. **Database Installer Bundle & Test**:
   ```powershell
   node dbscripts/build-install.mjs
   node --test dbscripts/build-install.test.mjs
   ```
   - Generated `dbscripts/install.sql` from 15 object files.
   - Result: **2/2 tests passed, 0 failures**.

2. **Backend Server Build**:
   ```powershell
   cd server && npm run build
   ```
   - Compiled NestJS application with 0 TypeScript errors.

3. **Frontend Web Build**:
   ```powershell
   cd web && npm run build
   ```
   - Vite and TypeScript production build succeeded in 2.64s.

---

## 6. Operational Compliance

- **Blank Database Policy**: Maintained canonical `CREATE TABLE` and index definitions directly; no migration drift or `ALTER TABLE` statements added.
- **Strict Database Prohibition**: Zero SQL scripts executed directly against any database.
- **Strict Version Control Prohibition**: Zero `git commit` or `git push` commands executed. All changes remain clean and unstaged for manual developer review.
