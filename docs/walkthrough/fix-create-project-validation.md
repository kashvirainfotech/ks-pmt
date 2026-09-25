# Walkthrough - Fix Project Creation Validation Errors & Empty UUIDs

## Issue Summary
When creating a new project from the web frontend modal (`/projects`), class-validator raised:
```
branchId must be a UUID, projectManagerUserId must be a UUID
```

## Root Cause
In [`server/src/modules/projects/dto/create-project.dto.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/projects/dto/create-project.dto.ts):
- Fields `branchId`, `projectManagerUserId`, and `clientId` were decorated with `@IsUUID() @IsOptional()`.
- In `class-validator`, `@IsOptional()` only skips validation when the value is `undefined` or `null`. When empty strings (`""`) or unpopulated values were passed from the frontend form state, `@IsUUID()` validated the string `""` and failed with `must be a UUID`.

## Solutions Applied

1. **[`server/src/modules/projects/dto/create-project.dto.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/projects/dto/create-project.dto.ts)**:
   - Added `@Transform(({ value }) => (value === '' || value === null ? undefined : value))` and `@ValidateIf((o, v) => v !== undefined && v !== null && v !== '')` to `clientId`, `branchId`, and `projectManagerUserId`.
   - Any empty strings or null values are normalized to `undefined` before validation, skipping the strict UUID check and enabling backend service fallbacks.

2. **[`web/src/components/projects/ProjectsView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/projects/ProjectsView.tsx)**:
   - Updated `handleCreateProject` to conditionally append `clientId`, `branchId`, and `projectManagerUserId` only when they are non-empty strings.
   - Cleanly resets form state upon successful submission.

## Verification
- Sent a test payload containing `clientId: ""`, `branchId: ""`, and `projectManagerUserId: ""` to `POST /api/v1/projects`.
- The request passed validation with `201 Created`.
- The backend automatically applied smart defaults (`branchId` resolved to user's primary branch, `projectManagerUserId` resolved to authenticated user).
