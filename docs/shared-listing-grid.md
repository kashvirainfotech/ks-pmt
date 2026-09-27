# Shared Listing Grid

`web/src/components/common/DataGrid.tsx` provides the shared listing UI using [TanStack Table v8](https://tanstack.com/table/v8/docs/overview), an MIT-licensed headless table library. The app owns its styling and toolbar; the library provides filtering, sorting, grouping, expansion, and pagination. No paid grid features are required.

## User controls

- Search matches the listing's columns. Filters adds independent contains filters; column filters combine with AND.
- Click a column heading to sort. Shift-click another heading to add a sort criterion. The Sort panel provides the same controls without keyboard modifiers, with direction toggles and numbered priority.
- Group adds columns in order to create nested groups. Expand individual groups or use Expand all / Collapse all. Remove and re-add a rule to change its precedence.
- Choose 10, 25, 50, or 100 rows per page. When grouped, pagination counts top-level groups and keeps their expanded children together. Filtering/sorting/grouping resets pagination.
- Print and Export CSV include every filtered record in the current sort/group order, including records on other pages and in collapsed groups. The output is a flat table with grouping columns included. It contains only configured data columns, never action controls or hidden fields.
- Add, View, Edit, Delete, Activate/Deactivate, and contextual actions appear only where supported by the screen and its existing permission rules. Deactivation is not relabeled as deletion. Destructive actions ask for confirmation.
- Theme colors follow the application's light/dark theme. Tables scroll horizontally within their container on narrow screens.

## Reuse

```tsx
import { Eye } from 'lucide-react';
import { DataGrid } from '../common/DataGrid';
import { useListing } from '../../hooks/useListing';

type RecordRow = { id: string; name: string; hours: number };

function ExampleListing() {
  const { rows, loading, error, reload } = useListing<RecordRow>('/example');
  return (
    <DataGrid
      title="Example records"
      data={rows}
      loading={loading}
      error={error}
      onRetry={reload}
      columns={[
        { id: 'name', label: 'Name' },
        { id: 'hours', label: 'Hours', type: 'number' },
      ]}
      actions={[
        { label: 'View', icon: Eye, onClick: row => openRecord(row.id) },
      ]}
    />
  );
}
// Supply the screen's openRecord handler and actual endpoint.
```

`GridColumn.value` supplies the value used for search, sorting, grouping, and export. `GridColumn.render` controls only the displayed React content, such as a status badge. Mark numeric columns with `type: 'number'` so decimal strings from PostgreSQL sort numerically. Row IDs must be unique. Keep column definitions stable when practical.

`GridAction` takes `label`, `icon`, and an async or synchronous `onClick`. Use `hidden`, `disabled`, and `danger` as needed. Authorize actions in the calling screen; the component does not infer permissions. Pass `onAdd`/`addLabel` for the primary action, `toolbar` for extra listing controls, and `extraActions` for custom row controls. Action errors appear inline, and shared row actions are disabled while a request runs.

For existing configurable masters, continue adding fields/columns to `management/config.ts` and rendering `EntityManager`. It supplies the grid, record forms, read-only details dialog, and existing API operations.

## Data scope and performance

`api/listings.ts` fetches every page of an authorized API result before showing it. `useListing` exposes loading, error, and retry state, cancels obsolete requests, and reloads when the selected branch changes. It understands top-level pagination metadata and the existing nested collection envelopes. An error on any page discards the incomplete result. Backend authorization and field redaction remain authoritative.

The grid currently processes the complete result in the browser. This makes multi-column grouping, sorting, and export consistent across pages, but increases requests and memory as a dataset grows. Use existing server filters (dates, branch, task scope) to narrow large datasets. For production-scale audit histories, add coordinated server-side filtering/sorting/grouping and export before switching to manual table pagination; sorting just one downloaded page would produce incorrect results.

CSV values are quoted, embedded quotes are escaped, and formula-like text is prefixed to prevent spreadsheet execution. Print uses a dedicated document with text nodes, so HTML in records is not interpreted as markup.

## Verification

Run `npm run build` in `web/`. The browser regression is `node web/tests/data-grid.cjs`; configure `PLAYWRIGHT_MODULE`, `BROWSER_EXE`, and optionally `UI_TEST_URL`. Start Vite first. The suite intercepts all API traffic with fixtures and does not access a database.
