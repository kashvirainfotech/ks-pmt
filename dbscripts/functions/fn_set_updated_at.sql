-- ========================================================
-- Function: fn_set_updated_at
-- Description: Generic trigger function to automatically set updated_at = CURRENT_TIMESTAMP
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    IF TG_TABLE_NAME = 'tasks' THEN
        NEW.revision = OLD.revision + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
