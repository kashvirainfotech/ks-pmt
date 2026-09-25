-- ========================================================
-- Function: fn_log_task_audit
-- Description: Trigger function to automatically record task changes into audit_logs
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE OR REPLACE FUNCTION fn_log_task_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_action_type VARCHAR(50);
    v_user_id UUID;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action_type := 'TASK_CREATED';
        v_user_id := NEW.created_by;
        v_new_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action_type := 'TASK_UPDATED';
        v_user_id := NEW.updated_by;
        
        -- Special status transition detection
        IF (OLD.status_id <> NEW.status_id) THEN
            v_action_type := 'TASK_STATUS_CHANGED';
        END IF;

        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_action_type := 'TASK_DELETED';
        v_user_id := OLD.updated_by;
        v_old_data := to_jsonb(OLD);
    END IF;

    INSERT INTO audit_logs (
        id,
        user_id,
        action_type,
        entity_name,
        record_id,
        old_values,
        new_values,
        remarks,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_action_type,
        'tasks',
        COALESCE(NEW.id, OLD.id),
        v_old_data,
        v_new_data,
        CONCAT('Automatic task lifecycle audit trigger: ', v_action_type),
        COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
