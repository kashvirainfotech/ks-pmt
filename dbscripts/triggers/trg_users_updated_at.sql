-- ========================================================
-- Trigger: trg_users_updated_at
-- Table: users
-- Description: Automatically updates updated_at column before row update
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();
