# Walkthrough: COLLAB-001 - Versioned Knowledge Base, Decision Docs (ADRs) & Specs Library

## 1. Executive Summary

**Feature Code**: `COLLAB-001`  
**Milestone**: Increment D — Product Management and Repeatable Delivery  
**Scope**:
- Enterprise-grade versioned Knowledge Base, Architecture Decision Records (ADRs), Technical Specifications, Runbooks, and Meeting Notes library.
- Immutable revision history with automated version incrementing, author tracking, and side-by-side diff comparisons.
- Bi-directional work item traceability linking knowledge documents to delivery `TASK`s, release `VERSION`s, project `MILESTONE`s, `REQUIREMENT_CRITERION` acceptance rules, and client `CHANGE_REQUEST`s.
- Immutable Amazon S3 asset attachment tracking per revision.
- Strict multi-tenant scope isolation (`GLOBAL`, `PRODUCT`, `PROJECT`) and granular audience visibility controls (`INTERNAL_ONLY`, `CLIENT_VISIBLE`, `PRODUCT_COMMUNITY`).
- Dynamic RBAC permissions: `KNOWLEDGE:READ`, `KNOWLEDGE:MANAGE`, `KNOWLEDGE:PUBLISH`, and `KNOWLEDGE:ARCHIVE`.

---

## 2. Database Schema Architecture

The static DDL definitions were added in canonical form to [`dbscripts/tables/tables.sql`](../../dbscripts/tables/tables.sql) (Tables 70–73):

```
+----------------------------------------------------------------------------------------------------+
|                                      KNOWLEDGE_DOCUMENTS                                           |
+----------------------------------------------------------------------------------------------------+
| id (UUID, PK)                                                                                      |
| document_code (VARCHAR, UNIQUE)                                                                    |
| title (VARCHAR(255))                                                                               |
| slug (VARCHAR(255), UNIQUE)                                                                        |
| category ('SPECIFICATION'|'ARCHITECTURE_DECISION'|'RUNBOOK'|'MEETING_NOTES'|'RELEASE_NOTES'|'POLICY')  |
| entity_type ('GLOBAL' | 'PRODUCT' | 'PROJECT')                                                     |
| product_id (FK -> products, NULLABLE)                                                              |
| project_id (FK -> projects, NULLABLE)                                                              |
| component_id (FK -> software_components, NULLABLE)                                                |
| audience ('INTERNAL_ONLY' | 'CLIENT_VISIBLE' | 'PRODUCT_COMMUNITY')                                |
| current_version (INTEGER, DEFAULT 1)                                                               |
| status ('DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SUPERSEDED' | 'ARCHIVED')                             |
| decision_outcome ('PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'DEPRECATED' | 'SUPERSEDED')               |
| superseded_by_document_id (FK -> knowledge_documents, NULLABLE)                                    |
| owner_user_id (FK -> users, NULLABLE)                                                              |
| tags (TEXT[] NOT NULL DEFAULT '{}')                                                                |
| audit columns: is_active, created_by, created_at, updated_by, updated_at                           |
+----------------------------------------------------------------------------------------------------+
       |
       | 1:N
       v
+----------------------------------------------------------------------------------------------------+
|                                  KNOWLEDGE_DOCUMENT_REVISIONS                                      |
+----------------------------------------------------------------------------------------------------+
| id (UUID, PK)                                                                                      |
| document_id (FK -> knowledge_documents, ON DELETE CASCADE)                                         |
| revision_number (INTEGER)                                                                          |
| title (VARCHAR(255))                                                                               |
| content_markdown (TEXT)                                                                            |
| change_summary (VARCHAR(500))                                                                      |
| author_user_id (FK -> users)                                                                       |
| audit columns: is_active, created_by, created_at, updated_by, updated_at                           |
| CONSTRAINT uq_knowledge_doc_revision UNIQUE (document_id, revision_number)                         |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
|                                    KNOWLEDGE_DOCUMENT_LINKS                                        |
+----------------------------------------------------------------------------------------------------+
| id (UUID, PK)                                                                                      |
| document_id (FK -> knowledge_documents, ON DELETE CASCADE)                                         |
| linked_entity_type ('TASK' | 'VERSION' | 'MILESTONE' | 'REQUIREMENT_CRITERION' | 'CHANGE_REQUEST')   |
| linked_entity_id (UUID)                                                                            |
| link_notes (TEXT)                                                                                  |
| audit columns: is_active, created_by, created_at, updated_by, updated_at                           |
| CONSTRAINT uq_knowledge_doc_entity_link UNIQUE (document_id, linked_entity_type, linked_entity_id) |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
|                                 KNOWLEDGE_DOCUMENT_ATTACHMENTS                                     |
+----------------------------------------------------------------------------------------------------+
| id (UUID, PK)                                                                                      |
| document_id (FK -> knowledge_documents, ON DELETE CASCADE)                                         |
| revision_number (INTEGER, DEFAULT 1)                                                               |
| file_name (VARCHAR(255))                                                                           |
| s3_key (VARCHAR(500))                                                                              |
| s3_bucket (VARCHAR(255) DEFAULT 'ks-pmt-documents')                                                |
| mime_type (VARCHAR(150))                                                                           |
| file_size_bytes (BIGINT)                                                                           |
| audit columns: is_active, created_by, created_at, updated_by, updated_at                           |
+----------------------------------------------------------------------------------------------------+
```

### Scope Integrity Constraint
Enforced at the schema level:
```sql
CONSTRAINT chk_knowledge_doc_scope CHECK (
    (entity_type = 'GLOBAL' AND product_id IS NULL AND project_id IS NULL) OR
    (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
    (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
)
```

---

## 3. Database Indexes & Query Optimizations

Added in [`dbscripts/indexes/indexes.sql`](../../dbscripts/indexes/indexes.sql):
- `idx_knowledge_docs_slug` ON `knowledge_documents(slug)`
- `idx_knowledge_docs_cat` ON `knowledge_documents(category, status)`
- `idx_knowledge_docs_scope` ON `knowledge_documents(entity_type, product_id, project_id)`
- `idx_knowledge_docs_audience` ON `knowledge_documents(audience, status)`
- `idx_knowledge_docs_owner` ON `knowledge_documents(owner_user_id)` WHERE owner_user_id IS NOT NULL
- `idx_knowledge_docs_superseded` ON `knowledge_documents(superseded_by_document_id)` WHERE superseded_by_document_id IS NOT NULL
- `idx_knowledge_revisions_doc` ON `knowledge_document_revisions(document_id, revision_number DESC)`
- `idx_knowledge_revisions_author` ON `knowledge_document_revisions(author_user_id)` WHERE author_user_id IS NOT NULL
- `idx_knowledge_links_doc` ON `knowledge_document_links(document_id)`
- `idx_knowledge_links_entity` ON `knowledge_document_links(linked_entity_type, linked_entity_id)`
- `idx_knowledge_attachments_doc` ON `knowledge_document_attachments(document_id, revision_number)`

---

## 4. RBAC Permissions & Baseline Seed Documents

Added in [`dbscripts/inserts/inserts.sql`](../../dbscripts/inserts/inserts.sql):
1. **Permissions Registered**:
   - `KNOWLEDGE:READ`: View knowledge documents, ADRs, runbooks, and revisions.
   - `KNOWLEDGE:MANAGE`: Create and edit knowledge documents, revisions, and links.
   - `KNOWLEDGE:PUBLISH`: Approve, publish, and record decision outcomes on documents.
   - `KNOWLEDGE:ARCHIVE`: Deprecate and archive knowledge documents.
2. **Role Mapping**:
   - `Super Admin`: READ, MANAGE, PUBLISH, ARCHIVE
   - `Project Manager`: READ, MANAGE, PUBLISH, ARCHIVE
   - `Developer`: READ, MANAGE
   - `QA Tester`: READ, MANAGE
   - `Branch Manager`: READ
   - `Support Exec`: READ
3. **Seed Baseline Documents**:
   - `DOC-ADR-001`: *"ADR 001: PostgreSQL Blank-Database Schema & Static Bundler Architecture"* (Global Architecture, Accepted)
   - `DOC-SPEC-001`: *"KashFlow ERP Multi-State GST Rule Engine Specification"* (Product Scoped, Client Visible, Linked to `TSK-ERP-004` & Version `v2.4.0`)
   - `DOC-RUN-001`: *"Acme Neo-Bank Core Banking Sandbox Disaster Recovery Runbook"* (Project Scoped, Internal Only, Linked to Milestone `MLS-ACME-002`)

---

## 5. Verification & Validation Evidence

### 5.1 Static Bundle Generation & Test Suite
Executed manifest generation and verification:
```powershell
node dbscripts/build-install.mjs
# Output: Generated install.sql from 14 object files. No SQL was executed.

node --test dbscripts/build-install.test.mjs
# Output:
# ok 1 - bundle includes all canonical SQL once, in manifest order, in one transaction
# ok 2 - bundle rejects omitted, duplicate, missing, and escaping source files
# tests 2, pass 2, fail 0
```

### 5.2 NestJS Backend Module
Implemented in `server/src/modules/knowledge/`:
- DTOs: `CreateKnowledgeDocDto`, `UpdateKnowledgeDocDto`, `CreateKnowledgeRevisionDto`, `LinkKnowledgeEntityDto`, `AddKnowledgeAttachmentDto`, `QueryKnowledgeDto`.
- Controller: RESTful endpoints under `/knowledge/documents`, `/knowledge/documents/:id/revisions`, `/knowledge/documents/:id/diff`, `/knowledge/documents/:id/links`, `/knowledge/documents/:id/attachments`.
- Service: Full CRUD, automatic slugification, revision bumping, diff comparison extraction, linked entity resolution, S3 asset attachment tracking.
- Registered in `app.module.ts`.
- Verified compilation: `nest build` completed with 0 errors.

### 5.3 React Web Frontend
Implemented in `web/src/components/knowledge/KnowledgeBaseWorkspace.tsx`:
- Two-panel layout: Filterable Document Explorer (by Category, Scope, Audience, Tags, Search) on the left, and rich Document Inspector on the right.
- Tabs:
  1. **Document Content**: Rendered Markdown reader with instant revision picker.
  2. **Revisions & Diffs**: Side-by-side diff comparison between any two revisions with highlight boxes and full revision history timeline.
  3. **Work Item Links**: Traceability board linking documents to Tasks, Versions, Milestones, Requirements, and Change Requests.
  4. **Attachments**: S3 asset card gallery displaying size, MIME type, bucket and key paths.
- Modals: "New Document", "Add Revision", "Link Work Item", and "Add Attachment".
- Integrated into `App.tsx` at route `/knowledge` and added to `Sidebar.tsx` navigation.
- Verified compilation: `tsc && vite build` completed with 0 errors.
