# Walkthrough: PROD-001 Product Discovery, Voting & Roadmaps

**Date & Time**: 2026-09-30 10:22:00 IST  
**Module**: Product Management & Repeatable Delivery (`PROD-001`)  
**Standard**: Senior Full-Stack Implementation (SRS §3.21 & Increment D Plan)

---

## 1. Overview & Business Objectives

`PROD-001` implements comprehensive product discovery, customer community voting, duplicate merging with atomic deduplication, and Now / Next / Later public roadmaps.

### Core Problems Addressed
1. **Product Discovery & RICE Prioritization**: Product Managers capture customer problem statements, private evidence/notes, expected outcomes, target customer segments, and objective RICE scoring (Reach, Impact, Confidence, Effort, Strategic Fit) with decision rationales.
2. **Moderation & Confidentiality**: Internal evidence, commercial impact (ACV/ARR), and private source customer identities are kept confidential. PMs curate customer-facing titles and sanitized descriptions before publishing ideas to the authenticated customer community.
3. **One Vote Per Organization Voting System**: Customer organizations vote on proposed features, but each client organization has an atomic guarantee of **exactly one vote per idea** (`UNIQUE (idea_id, client_id)`). Authorized representatives can cast or retract their organization's vote without leaking the identity or commercial weight of other voting clients. Independent follow capabilities (`product_idea_follows`) allow contacts to track updates.
4. **Duplicate Merging & Atomic Deduplication**: When consolidating duplicate proposals, organizations that voted on both the source and canonical idea are counted **only once**. Single votes on source ideas are migrated, and the canonical idea's aggregate vote count is atomically recalculated with full audit logging in `product_idea_merge_history`.
5. **Customer Roadmaps (Now / Next / Later)**: Authenticated views for licensed products present planned enhancements across Now (active commitments), Next (planned releases), and Later (future horizon). Target dates (e.g., "Q4 2026", "v3.1") are explicitly flagged as indicative and do not alter contractual commitments or SLAs. Released ideas link directly to approved changelog release notes.

---

## 2. Database Artifacts (`dbscripts/`)

Canonical schema definitions and indexes were appended according to development policies:

### 2.1 Table Definitions (`dbscripts/tables/tables.sql`)
- **Table 60: `product_ideas`**:
  - `idea_code` (`VARCHAR(30) UNIQUE NOT NULL`)
  - `product_id` (`UUID REFERENCES products(id) NOT NULL`)
  - `module_or_component_id` (`UUID REFERENCES software_components(id)`)
  - `title`, `sanitized_description`, `customer_problem`, `expected_outcome`, `target_segment`
  - `status`: `'PROPOSED'`, `'UNDER_EVALUATION'`, `'PLANNED'`, `'IN_DEVELOPMENT'`, `'RELEASED'`, `'DECLINED'`, `'DEFERRED'`, `'MERGED'`
  - `status_reason`, `roadmap_bucket` (`'NOW'`, `'NEXT'`, `'LATER'`), `indicative_target`
  - RICE fields: `reach`, `impact_score`, `confidence_score`, `effort_score`, `strategic_fit`, `rice_score`, `scoring_rationale`
  - Moderation & Community: `is_published`, `visibility`, `published_at`, `moderated_by_user_id`, `vote_count`, `follower_count`
  - Internal Confidential Audit: `submitted_by_client_id`, `submitted_by_contact_id`, `submitted_by_user_id`, `private_evidence_notes`, `internal_commercial_impact`
  - Duplicate Merging: `merged_into_idea_id`, `merged_at`, `merged_by_user_id`
  - Linkages: `target_version_id`, `delivery_task_id`, `changelog_summary`
  - Standard audit columns: `created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`
- **Table 61: `product_idea_votes`**:
  - `idea_id` (`UUID REFERENCES product_ideas(id)`), `client_id` (`UUID REFERENCES clients(id)`)
  - `voted_by_contact_id`, `voted_by_user_id`, `vote_revision`, `original_idea_id`, `is_active`
  - **Constraint**: `CONSTRAINT uq_idea_client_vote UNIQUE (idea_id, client_id)` guarantees atomic one-vote-per-organization.
- **Table 62: `product_idea_follows`**:
  - `idea_id` (`UUID REFERENCES product_ideas(id)`), `contact_id` (`UUID REFERENCES client_contacts(id)`)
  - `CONSTRAINT uq_idea_contact_follow UNIQUE (idea_id, contact_id)`
- **Table 63: `product_idea_merge_history`**:
  - `canonical_idea_id`, `merged_idea_id`, `merged_by_user_id`, `migrated_votes_count`, `deduplicated_votes_count`, `merge_notes`

### 2.2 Performance Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_product_ideas_product_status`, `idx_product_ideas_rice_score`, `idx_product_ideas_roadmap_bucket`, `idx_product_ideas_published`
- `idx_product_idea_votes_lookup`, `idx_product_idea_follows_lookup`, `idx_product_idea_merge_canonical`

### 2.3 Role Permissions & Seed Data (`dbscripts/inserts/inserts.sql`)
- `PRODUCT_IDEAS:READ`: Super Admin, Project Manager, Support Agent
- `PRODUCT_IDEAS:MANAGE`: Super Admin, Project Manager
- `PRODUCT_IDEAS:ROADMAP`: Super Admin, Project Manager

*Note*: Installer bundle regenerated via `node dbscripts/build-install.mjs`. 0 SQL statements executed directly against any database.

---

## 3. Backend Implementation (`server/`)

### 3.1 DTOs (`server/src/modules/product-ideas/dto/`)
- `create-product-idea.dto.ts`: Full validation with bounds checking for RICE scores and audit linkage fields.
- `update-product-idea.dto.ts`: Partial update DTO.
- `score-product-idea.dto.ts`: Numeric validator for RICE parameters.
- `moderate-product-idea.dto.ts`: Sanitization and visibility controls.
- `update-roadmap.dto.ts`: Indicative target and bucket assignments.
- `merge-product-idea.dto.ts`: Duplicate consolidation inputs.
- `query-product-ideas.dto.ts`: Filter by product, status, bucket, published state, and sorting.
- `submit-client-idea.dto.ts`: Customer portal proposal inputs.

### 3.2 Service Layer (`ProductIdeasService`)
- **RICE Formula Calculation**: Live computation:
  $$\text{RICE Score} = \frac{\text{Reach} \times \text{Impact} \times \text{Confidence}}{\text{Effort}}$$
- **Moderation Engine**: Separates private client problems and internal evidence from customer-visible sanitized summaries.
- **Atomic One-Vote-Per-Organization**: Handles casting, active re-casting, and retraction. Synchronizes aggregate `vote_count` on `product_ideas`.
- **Duplicate Merging & Vote Deduplication**:
  - Traverses source idea votes.
  - If the client organization already voted on the canonical idea, counts the vote as deduplicated without double counting.
  - If the organization only voted on the source idea, migrates the vote to the canonical idea.
  - Marks source idea as `MERGED` with link to `merged_into_idea_id`.
  - Recalculates distinct organization votes and saves audit summary in `product_idea_merge_history`.
- **Zero Confidentiality Leakage Client Portal Queries**:
  - Strictly scopes queries to products licensed by the caller's organization (`product_client_mappings`).
  - Strips RICE scores, private evidence notes, and internal commercial impact.
  - Returns `has_client_voted` and `is_following` flags specific to the caller.

### 3.3 Controller Layer & Client Portal Integration
- `ProductIdeasController` (`/product-ideas`): Protected internal PM endpoints guarded with dynamic permissions (`PRODUCT_IDEAS:READ`, `PRODUCT_IDEAS:MANAGE`, `PRODUCT_IDEAS:ROADMAP`).
- `ClientPortalController` (`/client-portal`): Exposes customer-facing endpoints guarded with `ClientContactGuard`:
  - `GET /client-portal/product-ideas`
  - `GET /client-portal/product-ideas/:id`
  - `POST /client-portal/product-ideas`
  - `POST /client-portal/product-ideas/:id/vote`
  - `POST /client-portal/product-ideas/:id/follow`
  - `GET /client-portal/roadmap`

---

## 4. Frontend Implementation (`web/`)

### 4.1 Internal Product Manager Workspace (`ProductRoadmapView.tsx`)
Located at `/product-roadmap` and linked in the sidebar under *Client Delivery*:
1. **Discovery Backlog Tab**:
   - Filterable data table displaying idea code, title, product, RICE score, R/I/C/E breakdown, vote count, roadmap bucket, status, and moderation state.
   - Live modal to capture discovery ideas with automatic RICE score preview.
   - Quick action drawers for RICE scoring, moderation & sanitized publishing, roadmap bucket assignment, and duplicate merging.
2. **Customer Roadmap Board (Now / Next / Later)**:
   - Visual three-column board partition with prominent contractual disclaimer.
   - Cards display idea code, indicative target dates (e.g. "Q4 2026"), sanitized descriptions, vote totals, and target version linkages.
3. **Merged & Deduplicated Tab**:
   - Audit trail of duplicate community submissions consolidated into canonical items.

### 4.2 Customer Portal Workspace Integration (`CustomerPortalWorkspace.tsx`)
1. **Ideas & Voting Tab (`COMMUNITY_IDEAS`)**:
   - Displays published, moderated ideas for licensed products with zero internal leakage.
   - Interactive organization vote toggle button displaying active organization vote status and total vote count.
   - Follow toggle button.
   - "Submit Feedback Proposal" modal for client contacts to submit enhancement requests for triage.
2. **Product Roadmap Tab (`ROADMAP`)**:
   - Authenticated Now / Next / Later roadmap cards tailored to the client's licensed solutions.
   - Displays indicative delivery horizon with contractual disclaimer and approved changelog notes for released items.

---

## 5. Verification & Test Results

### 5.1 Backend Unit Tests
- Tested `ProductIdeasService` in [`server/src/modules/product-ideas/product-ideas.service.spec.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/product-ideas/product-ideas.service.spec.ts):
  - `createIdea & RICE calculation`: computed score ($500 \times 3.0 \times 0.8 / 2.0 = 600$) and zero/missing input handling.
  - `scoreIdea`: updated parameters and persisted rationale.
  - `moderateIdea`: sanitized customer text and published flags.
  - `updateRoadmap`: assigned buckets and indicative targets.
  - `mergeDuplicateIdea`: prevented self-merge, verified atomic vote deduplication when organization voted on both ideas, migrated single votes, and updated canonical vote count.
  - `Customer Portal`: verified empty response for unlicensed products, zero leakage of RICE scores/private notes, one-vote-per-org toggle (cast vs retract), rejected voting on merged/declined ideas, independent follow toggle, and Now/Next/Later partitioning.
  - **Result**: `16 passed, 16 total`
- Full test suite: **`26 passed, 26 total (213 tests passed)`**

### 5.2 Frontend Build
- Executed `npm run build` in `web`:
  - `tsc` compiled with 0 errors.
  - Vite production bundle built successfully (`dist/assets/index-DLnlA6Ug.js`).
