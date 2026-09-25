# Bug Fix & Feature Update: Branch Synchronization in Project Creation

**Date**: 2026-09-25  
**Issue**: Alert popup stating `branchId must be a UUID, projectManagerUserId must be a UUID` and Header selected branch not passing to projects.  
**Resolution**: Completed end-to-end frontend and backend synchronization.

---

## 1. Problem Identification

1. **Header Selected Branch Not Visible or Configurable in Modal**:
   - The "Add Project" dialog lacked explicit form fields for **Operating Branch** and **Project Manager**.
   - The dialog defaulted to implicit state values that could be `null` or uninitialized strings (`"undefined"`).
   - When users switched branches in the Header dropdown, the Project list did not reactively filter by `branchId`.

2. **Backend DTO Validation Failure**:
   - `CreateProjectDto` applied `@IsUUID()` before transforming invalid non-UUID strings to `undefined`. If non-UUID strings arrived, class-validator failed with HTTP 400.

3. **Frontend Compilation Strictness**:
   - TypeScript checks identified missing `User` imports, loose nullability on `branchIdToSend` and `pmIdToSend`, and missing `project_manager_name` on the `Project` interface.

---

## 2. Solutions Implemented

### A. Frontend (`web/src/components/projects/ProjectsView.tsx`)
1. **Interactive Branch & Project Manager Selectors**:
   - Added an **Operating Branch** dropdown listing all active company branches (with `(HQ)` indicator), pre-selected to the currently chosen branch in the Header.
   - Added a **Project Manager** dropdown listing active staff members, defaulting to the current user.
2. **Reactive Synchronization with Header**:
   - Connected `selectedBranchId` from `useAuth()` to re-fetch projects dynamically via `projectsApi.getProjects(selectedBranchId ? { branchId: selectedBranchId } : undefined)`.
   - Projects list automatically updates when switching branches from the Header dropdown.
3. **Card Presentation**:
   - Displayed an operating branch badge and assigned Project Manager name on each project card.
4. **TypeScript Safety**:
   - Implemented `isUUID(val: string | null): val is string` type guard to satisfy TypeScript compiler.

### B. Backend (`server/src/modules/projects/dto/create-project.dto.ts`)
1. **Bulletproof UUID Transform**:
   - Updated `@Transform` on `branchId`, `clientId`, and `projectManagerUserId` to check UUID regex format. If invalid or empty, it transforms cleanly to `undefined`.
   - Prevents `branchId must be a UUID` or `projectManagerUserId must be a UUID` validation failures under all edge cases.

### C. Type Definitions (`web/src/types/index.ts`)
1. Extended `Project` interface with `project_manager_name?: string`.

---

## 3. Build & Runtime Verification

1. **Backend Build (`server`)**: `nest build` completed with code `0`.
2. **Frontend Build (`web`)**: `tsc && vite build` completed with code `0` (1966 modules transformed).
3. **Full System Test (`test_all_apis_and_screens.js`)**:
   - 16 / 16 Backend REST endpoints: **HTTP 200 OK** ✅
   - 8 / 8 Frontend Web Views: **HTTP 200 OK** ✅
   - Project Creation through Vite Proxy: **HTTP 201 Created** ✅
