-- ========================================================
-- Trigger: trg_users_updated_at
-- Table: users
-- Description: Automatically updates updated_at column before row update
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();
