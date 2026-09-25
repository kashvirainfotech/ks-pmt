# Walkthrough - Fix Administrator Default Password Hash

## Issue Summary
When attempting to log in on the Web application with default credentials (`admin@kashvirainfotech.com` / `Admin@123456`), the API returned:
```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid email credentials"
}
```

## Root Cause
In [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql), the initial seed statement for the Super Admin user contained an arbitrary dummy placeholder string (`$2b$12$uE5tT1gXoYgKzJ7x8C0aNeP0K1l8Q4mZ5vW3yU2tS1rA0bC9dE8fG`) rather than an actual bcrypt hash of `Admin@123456`. When `bcrypt.compare` checked the entered password against this hash, verification failed.

## Fix Applied

1. **Generated Real Bcrypt Hash**:
   - Plaintext Password: `Admin@123456`
   - Generated Bcrypt Hash: `$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO`
   - Verified via `bcrypt.compareSync('Admin@123456', hash)` -> returns `true`.

2. **Updated [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql)**:
   - Updated the initial insert block for new database seeds.
   - Appended an `UPDATE` statement at the bottom of the file so running the script immediately updates existing database records:
     ```sql
     -- ========================================================
     -- Date & Time: 2026-09-25 19:48:00 (IST)
     -- Description: Update Super Admin password hash to valid bcrypt for 'Admin@123456'
     -- ========================================================
     UPDATE users 
     SET password_hash = '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO',
         is_email_login_allowed = TRUE,
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP
     WHERE email = 'admin@kashvirainfotech.com';
     ```

## Action Required by DBA / Developer
Run the following SQL statement in your PostgreSQL database (pgAdmin / DBeaver / psql):

```sql
UPDATE users 
SET password_hash = '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO',
    is_email_login_allowed = TRUE,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@kashvirainfotech.com';
```

After executing this statement, you will be able to log in with:
- **Email**: `admin@kashvirainfotech.com`
- **Password**: `Admin@123456`
