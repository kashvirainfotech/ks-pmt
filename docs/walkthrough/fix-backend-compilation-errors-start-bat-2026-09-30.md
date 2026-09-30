# Walkthrough: Fix Backend TypeScript Compilation Errors for Service Startup (`start.bat`)

## 1. Problem Overview
When running `start.bat` to launch both KS-PMT backend and frontend services, `npm run start:dev` for the backend failed with TypeScript compilation errors shown in the watch mode terminal:
1. `Cannot find module '../rbac/rbac.decorator'` across controllers (`change-requests.controller.ts`, `handoffs.controller.ts`, `requirements.controller.ts`, `teams.controller.ts`, `uat-packages.controller.ts`).
2. `Argument of type '{ clientId: any; ... }' is not assignable to parameter of type 'ClientContactUser'` across 6 customer portal endpoints in `client-portal.controller.ts`.
3. `Cannot find name 'IsEnum'` and `Cannot find name 'IsBoolean'` in `accept-invite.dto.ts`.
4. Invalid relative guard and decorator paths in `client-reports.controller.ts`, `product-ideas.controller.ts`, and `raid.controller.ts`.

## 2. Minimal Changes Applied

### A. RBAC Decorator Bridge & Alias
- **Created [`server/src/modules/rbac/rbac.decorator.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/rbac/rbac.decorator.ts)**:
  Re-exports `RequirePermissions`, `Permissions`, and `PERMISSIONS_KEY` from `../../common/decorators/permissions.decorator`.
- **Updated [`server/src/common/decorators/permissions.decorator.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/common/decorators/permissions.decorator.ts)**:
  Added `export const Permissions = RequirePermissions;` alias.

### B. Validation Decorator Imports
- **Updated [`server/src/modules/client-portal/dto/accept-invite.dto.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-portal/dto/accept-invite.dto.ts)**:
  Imported missing `IsBoolean` and `IsEnum` from `class-validator`.

### C. Client Contact Typing in Client Portal
- **Updated [`server/src/modules/client-portal/client-portal.controller.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-portal/client-portal.controller.ts)**:
  Replaced manual partial object reconstruction `{ clientId: req.user.clientId, ... }` with `req.user as ClientContactUser` in the 6 Product Discovery & Roadmap endpoints, matching the convention of the other client portal controllers.

### D. Corrected Guard & Decorator Import Paths
- **Updated [`server/src/modules/client-reports/client-reports.controller.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-reports/client-reports.controller.ts)**:
  Targeted `../../common/guards/jwt-auth.guard`, `../rbac/rbac.guard`, and `../../common/decorators/permissions.decorator`.
- **Updated [`server/src/modules/product-ideas/product-ideas.controller.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/product-ideas/product-ideas.controller.ts)**:
  Targeted `../../common/guards/jwt-auth.guard`, `DynamicRbacGuard as PermissionsGuard` from `../rbac/rbac.guard`, and `../../common/decorators/permissions.decorator`.
- **Updated [`server/src/modules/raid/raid.controller.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/raid/raid.controller.ts)**:
  Targeted `../../common/guards/jwt-auth.guard`, `DynamicRbacGuard as PermissionsGuard` from `../rbac/rbac.guard`, and `../../common/decorators/permissions.decorator`.

## 3. Verification Results
- **Backend Build (`npm run build --prefix server`)**: Succeeded cleanly (0 errors).
- **Web Build (`npm run build --prefix web`)**: Succeeded cleanly (`vite build` finished in 4.59s).
- **Backend Test Suites**: All 26 test suites passed (213 tests passed).
