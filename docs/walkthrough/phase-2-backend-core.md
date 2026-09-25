# Phase 2 Walkthrough: Backend REST API Core & Authentication Setup

**Execution Date**: 2026-09-25  
**Component**: Backend Core REST API (`server/`)  
**Status**: Completed, Compiled & Verified  

---

## 1. Overview & Architecture

Phase 2 establishes the modular **NestJS (TypeScript)** backend REST API core, security middleware, PostgreSQL connection layer (safely parameterized with zero DDL execution), global error envelopes, response interceptors, dual authentication mechanism, and the dynamic RBAC permission engine with branch/user override support.

```
+-------------------------------------------------------------------------------+
|                             Client HTTP Request                               |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                    Security Layer (Helmet & Strict CORS)                      |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|              Logging Interceptor & Validation Pipe (DTO Whitelist)            |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                  JwtAuthGuard (Evaluates Bearer Token / @Public)              |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|    DynamicRbacGuard (Role Check + Branch Overrides + User Overrides Engine)   |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                     Controller -> Service -> DatabaseService                  |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|        TransformInterceptor (Uniform JSON Envelope: success, data, meta)      |
+-------------------------------------------------------------------------------+
```

---

## 2. Implemented Modules & Source Code Structure

### 2.1 Database Integration Layer (`server/src/database/`)
- [database.service.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/database/database.service.ts): Safe, parameterized connection pool using `pg.Pool`. Handles single queries and multi-statement ACID transactions (`transaction<T>`).
- [database.module.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/database/database.module.ts): Global module making `DatabaseService` injectable throughout the application.
- **Strict Compliance**: Zero automatic DDL migrations are executed by the application; schema matching is strictly maintained against static `dbscripts/`.

### 2.2 Global Interceptors, Filters & Decorators (`server/src/common/`)
- [transform.interceptor.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/interceptors/transform.interceptor.ts): Wraps all successful HTTP responses in a standard JSON envelope:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Operation successful",
    "data": {},
    "timestamp": "2026-09-25T13:25:00.000Z"
  }
  ```
- [http-exception.filter.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/filters/http-exception.filter.ts): Catches all `HttpException` and unhandled errors, transforming them into uniform error envelopes.
- [logging.interceptor.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/interceptors/logging.interceptor.ts): Logs HTTP method, URL, status code, and latency in milliseconds.
- [jwt-auth.guard.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/guards/jwt-auth.guard.ts): Global guard enforcing JWT validation by default unless marked with `@Public()`.
- [current-user.decorator.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/decorators/current-user.decorator.ts): Injects authenticated user payload into controller methods.
- [roles.decorator.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/decorators/roles.decorator.ts): Attaches `@Roles(...)` metadata.
- [permissions.decorator.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/decorators/permissions.decorator.ts): Attaches `@RequirePermissions(...)` metadata.

---

### 2.3 Dynamic RBAC & Permission Override Engine (`server/src/modules/rbac/`)
- [rbac.service.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/rbac/rbac.service.ts):
  - Resolves base permissions attached to the user's role.
  - Applies **Branch-Level Overrides** (`branch_permission_overrides`): Any permission marked `is_allowed = FALSE` for the active branch is revoked branch-wide.
  - Applies **User-Level Overrides** (`user_permission_overrides`): High-priority explicit grant (`is_granted = TRUE`) or revocation (`is_granted = FALSE`).
  - Automatically grants full access if `role_code === 'ROLE_SUPER_ADMIN'`.
- [rbac.guard.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/rbac/rbac.guard.ts):
  - Global guard reading `@Roles()` and `@RequirePermissions()`.
  - Supports multi-branch location header (`x-branch-id`) to evaluate branch-specific permissions dynamically.

---

### 2.4 Dual Authentication Engine (`server/src/modules/auth/`)
Supports the mandatory requirement: **No public self-registration; authentication via Email + Password or Mobile + OTP**.

#### Endpoints Implemented in [auth.controller.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/auth.controller.ts):

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login-password` | Public | Authenticate with official email and password. Returns JWT tokens & permissions. |
| `POST` | `/api/v1/auth/request-otp` | Public | Generates and sends a 6-digit cryptographic OTP to registered mobile number (5 min validity). |
| `POST` | `/api/v1/auth/login-otp` | Public | Verifies mobile OTP and issues access/refresh tokens. |
| `POST` | `/api/v1/auth/refresh-token` | Public | Refresh expired access token with refresh token rotation. |
| `GET` | `/api/v1/auth/me` | Bearer Auth | Retrieves current employee profile and compiled effective permissions. |
| `POST` | `/api/v1/auth/logout` | Bearer Auth | Invalidates active user session. |

#### Features:
- [otp.service.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/otp.service.ts): Cryptographic 6-digit code generation (`crypto.randomInt`), TTL expiration (300 seconds), brute-force attempt limits (max 5 attempts), and mock/live SMS gateway dispatch.
- [jwt.strategy.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/jwt.strategy.ts): Passport JWT strategy validating active account status from PostgreSQL on every request.
- [auth.service.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/auth.service.ts): Handles password hashing comparison (`bcrypt`), token generation, and audit login timestamps (`last_login_at`, `last_login_ip`).

---

### 2.5 Server Bootstrap & Documentation
- [main.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/main.ts):
  - Helmet security headers and CORS enabled.
  - Global `/api/v1` prefix.
  - Strict `ValidationPipe` with payload transformation and forbidden extra fields.
  - Swagger UI documentation configured at `/api/docs` with Bearer auth and `x-branch-id` header support.
- [.env.example](file:///c:/Projects/KashviraInfotech/ks-pmt/server/.env.example): Fully documented environment template covering DB, JWT, OTP, AWS S3, and Redis.

---

## 3. Build & Compilation Verification
- Dependencies installed: `npm install` (440 packages).
- Compilation test: `npm run build` executed and passed with 0 errors.
- Type definitions and JavaScript bundles verified in `server/dist/`.

---

## 4. Next Step
Proceed to **Phase 3: Organizational Masters & Dynamic Workflows REST API** (Branches, Departments, Designations, Users Provisioning, Task Types, and Workflow Transitions CRUD endpoints).
