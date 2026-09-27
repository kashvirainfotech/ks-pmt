-- ========================================================
-- Trigger: trg_projects_updated_at
-- Table: projects
-- Description: Automatically updates updated_at column before row update
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();
