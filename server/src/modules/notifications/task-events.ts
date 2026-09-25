// In-app events use only parameterized SQL and respect each recipient's preference.
// External email/FCM delivery requires a configured provider; do not claim delivery.
export async function taskEvent(
  db: { query: Function },
  taskId: string,
  actor: string,
  event: string,
  title: string,
  body: string,
  extraRecipients: string[] = [],
) {
  await db.query(
    `INSERT INTO notifications (recipient_user_id,sender_user_id,notification_type,title,body,entity_type,entity_id,is_read,is_push_sent,is_email_sent,created_by,updated_by)
    SELECT DISTINCT u.id,$2::uuid,$3::varchar,$4::varchar,$5::text,'TASK',$1::uuid,FALSE,FALSE,FALSE,$2::uuid,$2::uuid
    FROM users u WHERE u.is_active=TRUE AND u.id<>$2::uuid
      AND (u.id IN (SELECT user_id FROM task_assignees WHERE task_id=$1::uuid) OR u.id=ANY($6::uuid[]))
      AND COALESCE(to_jsonb(u)->'notification_preferences'->>'inApp','true')<>'false'`,
    [taskId, actor, event, title, body, extraRecipients],
  );
}
