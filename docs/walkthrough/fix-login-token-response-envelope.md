# Walkthrough - Fix Post-Login 401 Unauthorized / Token Extraction

## Issue Summary
After successfully receiving a `200 OK` on `POST /api/v1/auth/login-password`, subsequent API requests (such as `GET /api/v1/auth/me` and `POST /api/v1/auth/refresh-token`) failed with `401 Unauthorized`.

## Root Cause Analysis
1. **Double-Wrapped Response Envelope in Backend**:
   - In [`server/src/common/interceptors/transform.interceptor.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/interceptors/transform.interceptor.ts), line 34 previously required both `'data' in res` **and** `'meta' in res` to unwrap the handler payload.
   - Because `AuthController.loginWithPassword` returned `{ message: 'Login successful', data: result }` without a `meta` property, `TransformInterceptor` wrapped the entire object inside an extra `data` field:
     ```json
     {
       "success": true,
       "data": {
         "message": "Login successful",
         "data": { "accessToken": "...", "refreshToken": "..." }
       }
     }
     ```
2. **Missing Token Extraction in Frontend `AuthContext.tsx`**:
   - When the frontend received the double-wrapped response, `res?.data?.accessToken` resolved to `undefined`.
   - `localStorage.setItem('ks_access_token', 'undefined')` stored an invalid token string.
   - Subsequent authenticated requests (e.g. `GET /auth/me`) sent `Authorization: Bearer undefined`, triggering `401 Unauthorized`.
   - The Axios 401 interceptor attempted token refresh with `refreshToken: "undefined"`, which also failed with `401 Unauthorized`.
3. **Vite Deprecation Warning**:
   - Vite 8 reported a warning regarding `__dirname` in [`web/vite.config.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/vite.config.ts).

## Changes Applied

1. **[`server/src/common/interceptors/transform.interceptor.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/interceptors/transform.interceptor.ts)**:
   - Modified line 34 to unwrap `res.data` when `'data' in res` is present, regardless of whether `meta` is present:
     ```ts
     const hasData = res && typeof res === 'object' && 'data' in res;
     const data = hasData ? res.data : res;
     const meta = res && typeof res === 'object' && 'meta' in res ? res.meta : undefined;
     ```
   - This eliminates the double envelope and returns clean, uniform responses (`{ success: true, statusCode, message, data, timestamp }`).

2. **[`web/src/context/AuthContext.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/context/AuthContext.tsx)**:
   - Updated `loginWithPassword`, `loginWithOtp`, and `refreshUser` to extract tokens and user objects with fallback support for both flat and nested envelopes:
     ```ts
     const accessToken = data?.accessToken || data?.tokens?.accessToken;
     const refreshToken = data?.refreshToken || data?.tokens?.refreshToken;
     const userObj = data?.user ? { ...data.user, permissions: data.permissions } : data;
     ```
   - Ensured valid strings are written to `localStorage` and state is properly updated.

3. **[`web/vite.config.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/vite.config.ts)**:
   - Replaced `path.resolve(__dirname, './src')` with standard ESM `fileURLToPath(new URL('./src', import.meta.url))`, clearing the Vite configuration warning.

## Verification
Simulated full client lifecycle (login followed by authenticated dashboard calls):
- `POST /api/v1/auth/login-password` -> `200 OK` (Valid JWT access and refresh tokens returned)
- `GET /api/v1/auth/me` -> `200 OK` (Profile retrieved successfully for `admin@kashvirainfotech.com`)
- `GET /api/v1/branches` -> `200 OK`
- `GET /api/v1/departments` -> `200 OK`
- `GET /api/v1/designations` -> `200 OK`
- `GET /api/v1/tasks` -> `200 OK`
- `GET /api/v1/projects` -> `200 OK`
