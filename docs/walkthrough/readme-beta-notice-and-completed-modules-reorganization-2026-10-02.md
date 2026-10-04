# README.md: Beta Version Notice & Completed Modules Reorganization

**Date & Time**: 2026-10-02 14:11:00 (IST)  
**Task Reference**: User Request — Update README.md Beta notice, database installation policy, and completed vs planned feature sections  
**Target File**: `README.md`  
**Status**: ✅ Completed & Verified

---

## 1. Summary of Changes

In accordance with user instructions, the primary project documentation ([`README.md`](../../README.md)) was updated with two key revisions:

### 1.1 Beta Version & Database Installation Notice (Top Section)
- Added a prominent status badge at the top of the repository:
  `[![Status: Beta](https://img.shields.io/badge/Status-Beta%20Version-orange.svg)](https://github.com/kashvirainfotech/ks-pmt)`
- Added a dedicated warning box directly below the project description header:
  > **⚠️ Beta Version Notice — Database Installation & Upgrade Policy**
  > - **Blank Database / Fresh Install Only**: All database scripts located in [`dbscripts/`](../../dbscripts/) are strictly intended for a **blank database / fresh installation** and **not for upgrade purposes**. During this phase, database schemas are maintained directly in their canonical `CREATE` definitions without intermediate migration history.
  > - **Future Upgrades & Migration Scripts**: Once development of all planned points and thorough testing is fully completed, the project will transition to a stable release baseline. From that point onward, all future changes, feature additions, and bug fixes will be provided with formal **upgrade and migration scripts** (`ALTER`, data migrations) to preserve existing database installations.

### 1.2 Completed Features Reorganization
- Reorganized the completed capabilities under `## ✅ Completed Features & Functional Modules`.
- Instead of keeping completed roadmap items in the "Comprehensive Feature Roadmap" and marking them `[✅ Implemented]`, all completed capabilities were moved into 7 structured operational tiers:
  1. **Enterprise Foundations, Multi-Branch & Security**: Masters, Dual Auth & Dynamic RBAC, `FND-001` Working Calendars & Shifts, AWS S3 Pre-Signed Storage, Immutable Audit Trails.
  2. **Agile Planning, Work Breakdown & Daily Operations**: Jira-Style Task Experience, `PLAN-001` 4-Level Work Hierarchy & Sprints, `PLAN-002` Dependencies & Blocker Radar, `PLAN-003` Saved Views & Bulk Updates, `TIME-001` Schedule-Aware Timesheets & Global Timer, `PLAN-004` Delivery Teams & Components Catalog, `FLOW-001` Work Handoffs, `CONFIG-001` Visual Workflow Schemes & Transition Gates.
  3. **Client Delivery Lifecycle, Customer Portal & Milestone Sign-Off**: `CLIENT-001` & `CLIENT-002` Customer Portal & Private Intake Triage, `CLIENT-003` Requirements Specification & Traceability Matrix, `CLIENT-004` Scope Change Requests ($N+1$ Revisions), `CLIENT-005` Client UAT Packages & Milestone Sign-Off, `CLIENT-006` Progress Reports & Digest Briefings, `DEL-001` RAID Register & ADR Decisions.
  4. **Product Operations, Repeatable Quality & Collaboration**: `PROD-001` Product Discovery Backlog & RICE Roadmaps, `QA-001` Manual Test Suites, Test Runs & Release Gates, `COLLAB-001` Versioned Knowledge Base & ADRs, `COLLAB-002` Project/Task Templates with Idempotent Recurrence, `PROD-002` Product Goals & Outcome Reviews, `QA-002` Multi-Environment Issue Verification & Retest Matrix, `COLLAB-003` Granular Notification Preferences & Watchers, `COLLAB-004` "What Changed?" Activity Summaries, `COMM-001` Retainer & AMC Entitlements with Single-Consumption Ledger, `DATA-001` Guided CSV Onboarding Wizard & Sanitized Exports.
  5. **Delivery Intelligence, Analytics & Financial Management**: `ANALYTICS-001` Contractual SLA Policies & Risk Alerts, `ANALYTICS-002` Flow Analytics, WIP Limits & Cumulative Flow Diagrams, `ANALYTICS-003` Capacity Workload & Team Estimation Reliability, `ANALYTICS-004` Project Financials, Variance (EAC) & Delivery Margins.
  6. **Platform Extensibility, Automation & Configuration Toolkit**: `LATER-001` Advanced Scheduling & Critical Path Method, `API-001` Scoped Signed Outbound Webhooks & Delivery Ledger, `ADMIN-001` Enterprise Setup Wizard & Configuration Packages, `LATER-002` Source-Linked Drafting & Human-Reviewed Ledger.
  7. **Cross-Platform Mobile Application (Flutter)**: Flutter 3.x codebase on Android and iOS (5-tab navigation, offline-tolerant queues, GPS geofencing, camera evidence capture).

### 1.3 Clean Forward-Looking Roadmap & Scope Boundaries
- Updated `## 🗺️ Planned Roadmap & Future Scope` to only represent actual future, deferred, and environmental acceptance goals:
  - **Beta Hardening & Live Provider Acceptance**: Production SMS gateway credentials, production AWS SES verified domain & DKIM, production Firebase Cloud Messaging (FCM) push notification keys, mobile store release builds (Play Store & App Store), and high-concurrency stress testing.
  - **Post-Beta Enterprise Extensions (Deferred Scope)**: Multi-tenant partner hosting console, sandboxed plugin & extension runtime, in-product automated backup/restore console, universal visual automation designer, and dedicated monthly invoicing/billing lifecycle.
  - **Explicit Non-Goals & Boundaries**: Reaffirmed boundaries (no Git/CI-CD hosting, no general ledger ERP accounting, no unrestricted public self-registration).

---

## 2. Verification

- All links in the Table of Contents were updated and validated.
- Mermaid progression diagram correctly reflects current state (`Core Functional Modules (Completed)` &rarr; `Beta Hardening & Live Providers (Current)` &rarr; `Production Release & Upgrade Scripts` &rarr; `Post-Beta Enterprise Extensions`).
- Zero git commit or push commands were executed, strictly adhering to project guidelines.
