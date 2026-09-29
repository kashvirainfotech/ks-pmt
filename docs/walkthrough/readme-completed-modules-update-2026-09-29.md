# Walkthrough: README Completed Modules & Roadmap Status Update

**Date**: 2026-09-29  
**Status**: Completed  
**Artifact Modified**: `README.md`

---

## 1. Overview of Changes

The `README.md` file has been updated under the **`Current Implementation Status (Completed Modules)`** and **`Comprehensive Feature Roadmap`** sections to accurately reflect the completed features from Increment A and Increment B:

1. **Working Calendars & Capacity (`FND-001`)**:
   - Configurable working shifts, corporate public holidays, calendar assignments, employee leave requests/approvals, and dynamic effective working capacity calculation (`calculateWorkingCapacity`).

2. **Work Hierarchy, Sprints & Milestones (`PLAN-001`)**:
   - 4-level hierarchy (`Initiative` → `Epic` → `Task/Story/Bug` → `Subtask`), independent sprints and product/project milestones, backlog ranking, sprint commitment and rollover tracking, scope-change ledger with baseline snapshots.

3. **Dependencies, Blockers & Defect Templates (`PLAN-002`)**:
   - Finish-to-Start & Blocks/Blocked-by links with cycle prevention; Blocker Radar tracking active episodes, root-causes, and non-overlapping blocked duration; structured defect templates (steps, actual vs expected, environment, workaround, severity vs priority, resolution classifications).

4. **Saved Views, Inline Editing & Bulk Actions (`PLAN-003`)**:
   - Personal and team saved views, scope-based sharing (Personal, Team, Project, Global), system presets, inline grid cell editing, permission-aware bulk updates with optimistic concurrency / revision checks & partial failure reporting, Attention Workspaces.

5. **Weekly Timesheets & Persistent Global Timer (`TIME-001`)**:
   - Monday-to-Sunday weekly effort matrix, calendar expected hours integration with missing hours warnings, cross-project reviewer portion routing with self-approval prevention & rejection resubmission, database-backed persistent global timer across tabs/devices invariant to browser blur with task-switch auto-logging.

6. **Roadmap Status Indicators**:
   - Updated Tier A and Tier B roadmap items with clear `[✅ Implemented]` / `[Planned]` indicators for instant clarity to GitHub visitors and team developers.
