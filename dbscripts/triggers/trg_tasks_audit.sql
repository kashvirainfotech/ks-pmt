-- ========================================================
-- Trigger: trg_tasks_audit
-- Table: tasks
-- Description: Automatically logs task lifecycle events into audit_logs table
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

DROP TRIGGER IF EXISTS trg_tasks_audit ON tasks;

CREATE TRIGGER trg_tasks_audit
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION fn_log_task_audit();
