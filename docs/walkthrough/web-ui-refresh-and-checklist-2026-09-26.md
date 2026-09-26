# Web UI refresh, theme repair and checklist reconciliation

Date: 2026-09-26 (IST)

Updated the project checklist to separate implemented scope from unfinished features, blocked integrations and unverified production requirements. Refreshed the web interface and corrected the light/dark theme wiring.

## Checklist

`docs/tasks-checklist.md` now reflects the requirements audit and completion review. Live SMS, Redis, email/FCM delivery, advanced task fields, grouped timesheets, native mobile validation, S3 acceptance and production/security gates remain pending. Development database application is recorded as historically confirmed by the developer; production application and review remain separate. Historical implementation commits are distinguished from review/commit of current changes.

The checklist identifies implementation evidence rather than treating checked boxes as proof of production readiness. Older walkthroughs remain historical records; their broad completion claims have not been rewritten.

## Visual changes

- Grouped sidebar navigation into Workspace, Organization and Personal, with quieter active states and a compact desktop mode.
- Refreshed the dashboard heading, typography, neutral surfaces, cobalt accent, cards and spacing. Corrected sampled workflow percentages to use the sample size and clarified the completed-task sample label.
- Updated login presentation and product copy, added an appearance toggle and fixed the favicon reference.
- Standardized management panels, tables, form controls, tabs and timesheet date filters. Added clearer headings to portfolio/setup and improved the notification empty state.
- Adjusted the header for 320px screens, constrained branch labels and made notification popovers fit narrow viewports. Fixed the account menu's My Profile navigation.
- Added keyboard focus styling, a skip link, accessible control labels and reduced-motion support. Record/create-task dialogs now manage focus and Escape dismissal; the tested record dialog restores focus to its opener.

## Theme repair

The app toggled `.dark` on the root element, but Tailwind's default dark variant followed the operating-system media query. The stylesheet now explicitly binds dark variants to `.dark`, following [Tailwind's documented manual-theme approach](https://tailwindcss.com/docs/dark-mode).

Saved appearance is applied before first paint. Invalid saved values fall back to the OS preference, explicit choices persist across reloads, and changes synchronize across tabs. Native controls receive the correct color scheme. Shared surfaces, text and form colors now support both appearances.

Focus and reduced-motion changes were informed by [W3C accessibility guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance). This work does not claim a full WCAG conformance audit.

## Validation

- `npm run build` in `web/`: passed (TypeScript and Vite production build).
- `web/tests/ui-theme.cjs`: browser regression checks with Chromium/Edge and intercepted API fixtures. No live application records are created or changed.
- Ten authenticated routes exercised in both themes with the opposite OS preference: dashboard, tasks, projects, clients, timesheets, administration, profile, notifications, releases and audit.
- Login computed colors, reload persistence, invalid saved preference fallback and cross-tab synchronization checked.
- Branch dialog surface colors, focus containment, Escape dismissal and focus restoration checked.
- Dashboard/admin/tasks/timesheet layouts checked at 320px, 390px and 768px; header overlap and mobile navigation checked.
- Desktop sidebar collapse/expand checked for control clipping.
- No uncaught browser exceptions in the successful run. Results are saved in `ui-theme-results.json`.
- `git diff --check`: passed.

These are presentation and interaction checks using fixture data, not a rerun of live CRUD/provider tests. Native Flutter UI and external integration gaps remain outside this web refresh and remain pending in the checklist.

## Review artifacts

- [Light dashboard](ui-dashboard-light.png)
- [Dark dashboard](ui-dashboard-dark.png)
- [Light administration](ui-admin-light.png)
- [Dark administration](ui-admin-dark.png)
- [320px mobile](ui-mobile-320.png)
- [390px mobile](ui-mobile-390.png)
- [768px layout](ui-mobile-768.png)
- [Browser results](ui-theme-results.json)

Screenshots use synthetic records supplied by the test, not production data.

To rerun, start Vite and execute `node web/tests/ui-theme.cjs` from the repository root. Set `PLAYWRIGHT_MODULE` to an installed `playwright-core` module path and `BROWSER_EXE` to a Chromium/Edge executable; optionally set `UI_TEST_URL` (default `http://127.0.0.1:3000`). Browser tooling for this review was installed outside the repository, so application dependency manifests were not changed.

No database scripts/migrations were executed and no commits or pushes were made. Changes remain available for manual review.
