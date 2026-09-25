# Requirements and screen audit — 2026-09-25

The documented business forms had substantial omissions and several API contracts did not match their callers. This change adds the missing management forms and fields, repairs the affected APIs, and verifies real CRUD operations with the running database. It is **not a certification that the entire SRS is implemented**. Outstanding requirements are listed below; older walkthroughs that declare every phase complete should not be treated as test evidence.

Reviewed before implementation: root README and agent instructions, `docs/requirements.md`, `docs/plan.md`, `docs/tech-stack.md`, `docs/tasks-checklist.md`, deployment documentation, existing walkthroughs, and database script documentation.

## Screens and fields

| Requirement | Screen and changes | Verification |
|---|---|---|
| Branches | Masters: code/name, full address, postal code, contact details, latitude/longitude/radius, active state | Browser creation; zero coordinates preserved |
| Departments/designations | Masters: head, description, department association and hierarchy level | Browser creation |
| Employees | Organization placement, secondary branches, reporting manager, emergency contact, employment status, role lookup and login controls | Browser creation; new fields read back through API; activation/status consistency |
| Roles and permissions | Role CRUD and role/branch/user permission matrices | Browser role creation; effective override precedence verified through employee login |
| Clients/prospects | Contact designation, alternate phone, billing/tax/website/account manager/branch and conversion | Browser creation and API conversion |
| Products | Technical stack, documentation, plans, implementation fees and existing pricing/version fields | Browser creation; persistence checks |
| Product licenses | Client/type/start/end/AMC renewal/support tier/contract value; edit/remove | Browser creation and API support-tier update |
| Projects | Client/branch/manager, planned/actual dates, tech stack, budget/rate/currency, invoicing milestones, termination state | Browser creation and API persistence/date validation |
| Project allocation | Employee, project role, allocation percentage and dates; edit/remove | Browser creation |
| Versions/releases | Product or project, number/name, dates/changelog/status including deprecated; release timeline | Browser creation and timeline render |
| Task types | Billing default, default severity, custom-field schema definition | Browser creation; API default inheritance verified |
| Workflows | Status CRUD, transition setup and required-role field | Browser creation; prohibited transitions rejected |
| Assignment rules | Trigger, type/status/branch/department filters, strategy and target | Browser creation; existing routing unit tests |
| Tasks | Full core edit/create fields, multiple assignees and primary assignee, severity, dates, estimates, billing/currency; paginated filters and board drag/drop | Browser creation; API readback and workflow regressions |
| Subtasks/comments | Actual subtask routes, workflow-aware completion, nested reply entry and error handling | API creation/reply/completion/readback |
| Worklogs | Date/hours/summary/billable/overtime/weekend, date filters, submission and manager approval/rejection | Browser entry; employee submit/reject/resubmit/approve; approved deletion denied |
| Profile | Preferences, S3 photo upload, password change, device sessions/revocation | Browser preferences; API preferences/rotation/revocation |
| Notifications | Paginated inbox, read actions, task links; task/assignment/status/comment events | Screen render and in-app event delivery |
| Audit | Existing event detail screen, corrected filters, added dates/pagination/error feedback | Browser action/date filters and pagination passed |
| Dashboard | Response normalization, real total task count, correct status categories, recent sample labels and currency-separated charge amounts | Screen render and build |

## Backend and data corrections

- Canonical UUID validation accepts the database's existing seeded identifiers while rejecting malformed values. Project creation no longer silently selects an arbitrary client or removes invalid IDs.
- Extended fields are written atomically with the base record. Missing columns produce an actionable error before writing the base record.
- Corrected pagination, booleans, date ranges, amount zero handling, subtask grouping, assignment validation, version ownership, upload confirmation, refresh rotation, and structured database constraint errors.
- Removed prefilled administrator credentials from the web and mobile login screens.
- Added tracked device sessions. Revocation rejects both access and refresh tokens; password changes revoke tracked sessions. Pre-existing access tokens without a session ID retain their original expiration behavior.
- Added branch checks for core records and their related worklogs/comments/attachments, and financial-field redaction. The checks exercised by tests are specific cases, not a complete authorization penetration test.
- Added in-app event notifications. Provider delivery flags are no longer marked successful by a logging-only stub.
- SQL artifacts remain in the required cumulative files: `dbscripts/tables/alter_tables.sql`, `dbscripts/tables/tables.sql`, and `dbscripts/indexes/indexes.sql`. They add the documented fields, worklog review state, preferences, sessions and indexes.
- The user confirmed manual application of those scripts. Verification used application APIs; the agent did not execute SQL scripts or migrations. No commits or pushes were made.

## Test evidence

The tests use the supplied administrator account and isolated employees/records beginning with `QA-`. Browser tests fill actual rendered forms and check their POST responses. API tests independently read persisted fields and exercise transitions using an employee session.

- `requirements-browser-results.json`: administrator login, twelve entry forms, eight route renders, no uncaught browser exceptions, and created record IDs.
- `requirements-relations-results.json`: thirteen successful checks covering related forms and business APIs.
- `requirements-schema-results.json`: persistence, inherited defaults, employment status, approvals, notification preferences/events and session checks.
- `requirements-final-results.json`: browser worklog/preferences, branch isolation, financial redaction, and the S3 failure below.
- `requirements-mobile-width.png`: browser screenshot at a mobile viewport; this is not native mobile validation.
- Final backend production build, frontend production build, and six Jest suites (18 tests) pass. A final browser check also verified empty initial password, administrator login, and audit action/date filters and pagination. `git diff --check` passed. Relative Dart imports resolve, including the previously missing notification model.

Browser scripts live in `web/tests/requirements-*.cjs`. They require `TEST_EMAIL` and `TEST_PASSWORD`; browser scripts also require Playwright and a browser (`PLAYWRIGHT_MODULE`, `BROWSER_EXE`). Run browser creation, relations, schema, then final checks in that order. They create retained test records and should not be used as destructive cleanup scripts. Test employees use a test-only password within the scripts; production administrator credentials are not stored there. The latest dataset and IDs are in the browser results artifact. Earlier QA datasets also remain for inspection.

## Blockers and remaining requirements

1. **S3 credentials:** the real test PUT returned HTTP 403, AWS code `InvalidAccessKeyId`. Signing a URL alone does not verify credentials. Upload confirmation/download therefore could not be validated against S3. The failed upload metadata remains inactive. Valid S3 credentials and browser CORS configuration are needed for the complete upload test.
2. **Native mobile validation:** Flutter/Dart is not installed in the environment. Mobile API paths, parsing, refresh handling, imports, manual/timer worklog entry and file picking were corrected, but no Android/iOS build or device test is claimed.
3. **Notification providers:** actual SMS OTP dispatch, transactional email, FCM, scheduled deadline alerts and a real-time transport remain unfinished. OTP mock mode is explicitly gated; without a configured implementation the API reports unavailability. Persisting channel preferences does not itself deliver email or push.
4. **Advanced task fields:** custom-field definitions can be maintained, but dynamic per-task value storage/rendering is not implemented. Rich-text descriptions/comments and comment-specific attachment composition also need work. Individual assignees support a primary flag, not a separate arbitrary responsibility matrix.
5. **Approvals/reporting:** approval works per worklog; grouped weekly/monthly submission and sign-off, export features and full aggregate reporting are not implemented. The dashboard explicitly labels recent samples rather than presenting them as company-wide totals.
6. **Mobile features:** offline drafts/cache with conflict-aware synchronization, integrated GPS/geofence workflows, notification deep links, and full web/mobile feature parity remain incomplete.
7. **Security/integration scope:** password expiration, MFA challenge flow, external API-key/OAuth provisioning and IP allowlists remain incomplete. Fine-grained authorization across every secondary lookup/report route still requires a full security review. Session revocation and the tested core branch checks do not establish OWASP compliance.
8. **Audit/operations:** the event viewer exists, but complete coverage of failed authentication, all changes/downloads, actor/IP/user-agent/location metadata, performance/SLA tests, backup/restore and availability targets are not verified by these tests.

These remaining items require continued implementation and, for provider/native checks, working external configuration or SDKs. The screen and API repairs should be reviewed with these limits in mind.

## Handoff

Verified the manually applied database changes through the application. Added/fixed the main management screens, fields and APIs, and created QA test entries. Builds and 18 unit tests pass; the schema suite passes all 15 checks. Upload testing is blocked by S3 `InvalidAccessKeyId`, and native mobile validation needs Flutter/Dart. Broader unfinished SRS features remain explicitly listed above. Changes are uncommitted.
