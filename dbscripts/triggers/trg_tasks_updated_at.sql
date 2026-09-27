-- ========================================================
-- Trigger: trg_tasks_updated_at
-- Table: tasks
-- Description: Automatically updates updated_at column before row update
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();
