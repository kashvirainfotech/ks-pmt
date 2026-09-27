# Shared Listing Grid Rollout

Replaced the active listing screens' separate table implementations with a common React component based on MIT-licensed TanStack Table v8. Added search, per-column filters, pagination, multi-column sort controls, nested grouping, expandable groups, icon actions, CSV export, print, loading/error/empty states, and light/dark styling.

## Integration

- All entity/master screens: branches, departments, designations, employees, task types, statuses, roles, assignment rules, projects, products, versions, and clients.
- Workflow transitions, permission editor, task table, timesheets/approvals, audit trail, notifications, release listing, and device sessions.
- Project members, product licenses, task subtasks, worklog history, and attachments.
- Existing CRUD forms, detail data, task board, comments, approvals, and permission checks remain in their screen components. Masters retain Activate/Deactivate actions; Delete is used only for existing supported operations. Existing relationship tests now use the View action label.

The shared loader retrieves all authorized result pages before client-side processing and cancels obsolete requests. Search, grouping, sorting, print, and CSV export therefore cover the full result rather than the visible page. Exports include only configured listing columns; text and CSV escaping prevent record content from becoming executable markup or formulas.

Read [the shared grid guide](../shared-listing-grid.md) for component usage, controls, and the client-side data-size tradeoff. Very large production datasets will need coordinated server-side grouping/sorting/export; this change does not add backend query features.

## Validation

- Production TypeScript/Vite build passed. Vite reports the single application chunk above the default 500 kB advisory threshold (approximately 511 kB, 152 kB gzip).
- Mocked browser checks passed for search, empty results, pagination/reset, column filters, multi-column sorting, nested grouping and counts, numeric sorting, CSV formula escaping, print/export scope, record forms, related/subtask grids, workflow deletion, permission editing, read-only actions, fetch failure/retry, and light/dark/mobile rendering.
- Existing 14-screen master navigation regression passed, including direct URLs, forms, reloads, history, legacy redirect, mobile navigation, and authentication.
- Screenshots reviewed: [light](data-grid-light.png), [dark](data-grid-dark.png), [mobile](data-grid-mobile.png).
- No live database/API writes, SQL execution, commits, or pushes were performed. API traffic in browser tests was intercepted with fixtures.

Browser scripts: `web/tests/data-grid.cjs` and `web/tests/master-navigation.cjs`. The new shared component is `web/src/components/common/DataGrid.tsx`; no paid license is needed.
