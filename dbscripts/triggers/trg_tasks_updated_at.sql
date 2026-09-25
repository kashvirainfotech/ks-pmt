-- ========================================================
-- Trigger: trg_tasks_updated_at
-- Table: tasks
-- Description: Automatically updates updated_at column before row update
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();
