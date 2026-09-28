# Customer Portal & Product Feature Voting Engine Specifications

**Date**: 2026-09-28 (IST)  
**Document**: Customer Portal & Feature Voting Engine Roadmap Synchronization Report  
**Context**: Expanding KS-PMT with a dedicated Customer Portal (supporting both proprietary software product licensees and custom development project clients) and a Product Feature Request & Customer Voting Engine.

---

## 1. Executive Summary

To expand KS-PMT into a customer-collaborative ecosystem while maintaining strict enterprise security and data isolation, two key capabilities have been added across the project specifications and roadmap:

1. **Customer Portal (Client Self-Service & Issue Tracking)**:
   - Authenticated portal access for authorized representatives of active client companies.
   - Dual-client support: Custom Project Clients and Software Product Licensees.
   - Self-service bug reporting, task submission, and support ticket logging with pre-signed AWS S3 file attachments.
   - High-level Milestone & Delivery Timeline views for releases and versions.
   - Strict multi-tenant data isolation and absolute redaction of internal employee notes (`is_internal_only = TRUE`), employee costings, billing rates, and internal assignees.

2. **Product Feature Request & Customer Voting Engine (Crowdsourced Roadmap)**:
   - A shared feature request and enhancement forum for licensed customers of proprietary software products.
   - A 1-vote-per-client voting mechanism with operational impact justification statements.
   - A Product Manager prioritization report ranking feature requests by raw popularity (vote count) and revenue impact (ACV / ARR of voting clients).
   - A customer-visible product roadmap with automated notification triggers on stage transitions (`PROPOSED` -> `UNDER_EVALUATION` -> `PLANNED` -> `IN_DEVELOPMENT` -> `RELEASED`).

---

## 2. Updated Project Documents

The following documents have been synchronized:

1. [docs/requirements.md](../requirements.md):
   - **Section 2 (Stakeholders)**: Updated `Client / Customer User (Portal & API)` role.
   - **Section 3.20**: Added functional specification for Customer Portal (provisioning, boundary isolation, redaction, task creation, delivery timeline).
   - **Section 3.21**: Added functional specification for Product Feature Request & Customer Voting Engine (crowdsourced ideation, upvoting, demand dashboard, public roadmap, automated alerts).

2. [docs/tasks-checklist.md](../tasks-checklist.md):
   - **Section 11.7**: Added 7 granular checklist items for Customer Portal implementation and security gates.
   - **Section 11.8**: Added 5 granular checklist items for Product Feature Requests, voting logic, prioritization reports, and notifications.

3. [docs/plan.md](../plan.md):
   - **Phase 10 (Deliverables 10.7 & 10.8)**: Added architectural goals and deliverables for customer self-service and product voting analytics.

4. [README.md](../../README.md):
   - **Table of Contents**: Added entries for Section 17 (Customer Portal) and Section 18 (Feature Voting Engine).
   - **Feature Matrix & Implementation Status**: Added Section 17 and Section 18 with explicit `[x]` / `[ ]` status indicators.

---

## 3. Compliance & Governance

- In strict compliance with `AGENTS.md` and `GEMINI.md`:
  - No `git commit` or `git push` commands were executed.
  - No database commands or migration scripts were executed.
  - All files remain unstaged/uncommitted for developer manual review.
