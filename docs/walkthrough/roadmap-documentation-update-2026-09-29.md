# Accepted roadmap documentation update

Date: 2026-09-29 (IST).

Updated the README and relevant documents to apply the accepted [roadmap review](roadmap-review-and-market-recommendations-2026-09-28.md). The roadmap now prioritizes development planning and client delivery, followed by product management and delivery intelligence. Git integration, DevOps and CI/CD automation remain out of scope.

## Changes

- [README](../../README.md): Separate evidence-based current status from planned delivery; summarize increments A–E and later options with stable feature IDs. Clarify pending SMS, S3, audit, notification and native acceptance. Preserve installation and contact content, align React version/ports with local source, and remove the unsupported fixed development OTP claim.
- [Requirements](../requirements.md): Define private client versus shared product audiences, triage, requirement baselines, revision-specific change approvals, UAT/sign-off, progress reports, product discovery/goals, manual QA, knowledge/templates, retainers and risks. Clarify sprint/release separation, calendar-aware time, blocker episodes, SLA semantics and measurement formulas with acceptance examples.
- [Plan](../plan.md): Replace the large Phase 10 deliverable with dependency-ordered increments and explicit gates. Retain original phases as foundation scope, with quality checks in every increment and native field work no longer a gate for web/client delivery.
- [Checklist](../tasks-checklist.md): Track the accepted feature IDs and acceptance work without marking roadmap implementation complete. Preserve historical evidence, consolidate overlapping timesheet entries, and reconcile documented grid sorting/custom-component status.
- [Architecture](../tech-stack.md): Distinguish current implementation from target infrastructure and specify domain, permission, event, revision, transaction, notification and S3 boundaries for the planned flows. Align pagination naming and local stack facts.
- [User journeys](../walkthrough.md): Label planned behavior and add client request-to-acceptance, product feedback-to-outcome, and schedule-aware planning/timesheet journeys.
- [Deployment guide](../deployment-guide.md): Clarify that operational instructions do not certify readiness; align documented environment keys and API port with local source.
- [GEMINI instructions](../../GEMINI.md) and [agent rules](../../.agent/rules/agent-rules.md): Align the duplicate schema-policy wording with the authoritative blank-database development policy in AGENTS.md.
- Four earlier roadmap/update walkthroughs retain their historical content with superseded notices pointing to the accepted canonical documents.

Stable IDs span foundation, planning, time, client delivery, product, QA, collaboration, commercial usage, risks, analytics and later options. Monthly summaries/exports and rich comments remain planned; separate monthly approval, employee leaderboards, internet-public roadmaps and a universal automation designer are explicitly deferred.

## Validation and limits

Validation passed: local links/anchors, balanced code fences and encoding checks across 15 Markdown files (including the existing review report), all 25 stable feature IDs present in each of README/SRS/plan/checklist, and no roadmap implementation boxes checked complete. Reviewed conflicting roadmap wording; `git diff --check` passed. The README's pre-existing missing local LICENSE link now points to the MIT text already used by its license badge; no license file was created.

No application tests were run because no application code changed. Historical build, fixture, database/provider and native acceptance evidence was not rerun or upgraded by this update.

Only Markdown files were changed. No SQL or application code was modified, no database scripts were executed, and no commits or pushes were made. Changes remain available for manual review.
