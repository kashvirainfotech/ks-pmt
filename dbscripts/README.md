# Database Scripts Repository (`dbscripts`)

This folder contains all static database schema definitions, stored objects, indexes, and seed data for the **KS-PMT** PostgreSQL database.

---

## Strict Maintenance & Execution Guidelines

### 1. Developer Execution Only
- **Scripts are NEVER to be executed automatically by AI agents.**
- All scripts in this directory are static artifacts for human developer and DBA review, testing, and manual execution on target environments.

### 2. File Organization Rules

| Object Type | Folder Location | Maintenance Policy |
| :--- | :--- | :--- |
| **Tables** | `dbscripts/tables/tables.sql` | Single cumulative file. New `CREATE TABLE` statements are appended at the bottom with a datetime comment header. |
| **Alter Tables** | `dbscripts/tables/alter_tables.sql` | Single cumulative file. New `ALTER TABLE` statements are appended at the bottom with a datetime comment header. |
| **Indexes** | `dbscripts/indexes/indexes.sql` | Single cumulative file. New `CREATE INDEX` statements are appended at the bottom with a datetime comment header. |
| **Inserts / Seed** | `dbscripts/inserts/inserts.sql` | Single cumulative file. New `INSERT` statements are appended at the bottom with a datetime comment header. |
| **Views** | `dbscripts/views/*.sql` | Individual `.sql` file per view. Existing files must be edited in-place with `CREATE OR REPLACE VIEW`. |
| **Sequences** | `dbscripts/sequences/*.sql` | Individual `.sql` file per sequence or `sequences.sql`. |
| **Functions** | `dbscripts/functions/*.sql` | Individual `.sql` file per function. Existing files must be edited in-place with `CREATE OR REPLACE FUNCTION`. |
| **Procedures** | `dbscripts/procedures/*.sql`| Individual `.sql` file per procedure. Existing files must be edited in-place with `CREATE OR REPLACE PROCEDURE`. |
| **Triggers** | `dbscripts/triggers/*.sql` | Individual `.sql` file per trigger. Existing files must be edited in-place. |

### 3. Datetime Comment Header Standard
When appending new statements to cumulative files (`tables.sql`, `alter_tables.sql`, `indexes.sql`, `inserts.sql`), always format the header as follows:

```sql
-- ========================================================
-- Date & Time: YYYY-MM-DD HH:MM:SS UTC/IST
-- Author: <Name / Agent>
-- Description: <Clear explanation of changes>
-- ========================================================
```

### 4. Mandatory Column Requirements
- **Audit Columns on ALL tables**:
  - `created_by UUID NOT NULL` (or reference to `users.id`)
  - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL`
  - `updated_by UUID`
  - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL`
- **Active Flag on ALL master tables**:
  - `is_active BOOLEAN DEFAULT TRUE NOT NULL`
