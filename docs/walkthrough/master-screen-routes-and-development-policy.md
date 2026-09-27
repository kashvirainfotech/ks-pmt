# Master Screen Routes and Development Database Policy

## Changes

Documented the under-development lifecycle in `AGENTS.md` and the README database setup section. After major changes, the developer / DBA rebuilds and tests against a blank database. Schema changes belong in canonical `CREATE` definitions rather than accumulated `ALTER`, `UPDATE`, `DROP`, or `DELETE` migrations. Seed inserts and SQL function/procedure application logic remain supported. Incremental migrations begin once the project is explicitly declared live. This policy overrides the older append-only rules during development.

This task documents the database policy; it does not rewrite existing SQL artifacts or execute database scripts.

Replaced portfolio and organization master tabs with individual screens, URLs, headings, descriptions, and sidebar links. A shared screen registry keeps routes and navigation aligned. Existing CRUD forms, related records, and permission behavior are retained. Switching routes resets form state. The permission screen retains its role/branch/user selector because those are modes within the permission editor.

| Screen | URL |
| --- | --- |
| Projects | `/projects` |
| Products | `/products` |
| Versions | `/versions` |
| Clients (existing screen) | `/clients` |
| Branches | `/admin/branches` |
| Departments | `/admin/departments` |
| Designations | `/admin/designations` |
| Employees | `/admin/employees` |
| Task types | `/admin/task-types` |
| Statuses | `/admin/statuses` |
| Roles | `/admin/roles` |
| Assignment rules | `/admin/assignment-rules` |
| Transitions | `/admin/transitions` |
| Permissions | `/admin/permissions` |

The previous `/admin` URL redirects to `/admin/branches`. Existing browser workflow scripts now navigate through sidebar links instead of the removed tabs.

## Validation

- `npm run build` in `web/`: passed (TypeScript and Vite production build).
- Syntax checks for the updated browser workflow scripts: passed. These live-data scripts were not executed.
- Browser navigation regression: passed for all 14 screens, including mobile navigation and authentication.
- `git diff --check`: passed.

The new `web/tests/master-navigation.cjs` uses mocked API responses, covering all 14 direct URLs, active menu links, form opening, reloads, browser history, the legacy redirect, form reset, mobile navigation, and authentication. Run it with `node web/tests/master-navigation.cjs`; set `PLAYWRIGHT_MODULE` to an installed Playwright module, `BROWSER_EXE` to a Chromium/Edge executable, and optionally `UI_TEST_URL` (default `http://localhost:3000`). No database-backed behavior is validated by this fixture-based test.
