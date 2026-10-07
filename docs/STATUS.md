# Current project status

Last updated: 2026-10-07.

## Current checkpoint

Public booking, reusable meal-plan templates, private branded meal-plan PDF generation, the provider-neutral appointment reminder center, consultation packages, the session-consumption ledger, monthly operational reporting, Excel export, and the expanded dashboard are complete and committed to `main`.

The secure pre-consultation intake increment is complete and browser-validated. Clinicians can create expiring single-use links, revoke unused invitations, and review immutable patient submissions without automatically overwriting the professional clinical history. The validated flow created a link, registered patient answers, rejected reuse of the completed link, and created a second working invitation.

A Twilio WhatsApp Sandbox adapter is committed and awaits account credentials plus one live test. It is intentionally restricted to one organization and one joined test number; production patient delivery remains disabled.

Reusable consultation packages and the immutable session-consumption ledger are browser-validated. The local validation created four package definitions and sold two packages with linked payments to synthetic patients. The monthly report and Excel workbook were also validated through the authenticated application flow.

Individual-food work remains intentionally paused. The user is consulting a nutritionist to validate the regional data source and professional workflow; do not invent or seed nutritional values while this decision is pending.

## Completed locally

- Foundation, authentication, organization tenancy, RLS, and audit infrastructure.
- Patients, consent, adult anthropometry, extended circumferences/skinfolds, and progress charts.
- Internal appointments and controlled status lifecycle.
- Structured meal-plan drafts, items, activation, and immutable published plans.
- Payments and organization-local monthly totals.
- SOAP consultations, clinical histories, dietary histories, and laboratory results.
- Adult energy calculations using Mifflin-St Jeor (1990), revised Harris-Benedict / Roza-Shizgal (1984), and FAO/WHO/UNU (1985).
- Activity and goal adjustment, macro distribution by percentage or g/kg, immutable calculation history, and meal-plan target prefill.
- Organization-configurable food groups, equivalent nutrient snapshots on draft plan items, and estimated plan totals.
- Configurable professional availability, one-off agenda blocks, and an enableable public booking link.
- Mobile public slot selection with minimal patient contact data, pending appointment creation, versioned privacy consent, conflict protection, and durable HMAC-based rate limiting.
- Organization-owned meal-plan templates that snapshot meal structure, items, equivalents, targets, and instructions without patient identity, then create independent patient-specific drafts.
- Owner-managed clinic identity and private, audited two-page meal-plan PDFs generated only from immutable plans.
- Automatic appointment confirmation, 24-hour, and 2-hour reminder scheduling with configurable channel, cancellation, missing-contact visibility, idempotent worker leases, bounded retries, and immutable attempt history.
- An Agenda reminder center that clearly distinguishes queued, sent, cancelled, failed, and contact-blocked jobs. Live delivery remains disabled until a messaging provider is selected and configured.
- Reusable package definitions, patient purchases with frozen commercial terms, linked paid/pending payments, derived session balances, completed-appointment consumption, and immutable compensating reversals.
- Organization-local monthly operational reporting with appointment, no-show, revenue, pending-balance, package-sale, and session-consumption totals.
- Protected Excel export with reconciliable `Resumen`, `Citas`, `Pagos`, and `Paquetes` worksheets and no clinical or patient-contact fields.
- Expanded operational dashboard metrics for appointments, billing, packages, and session balances.
- Expiring and revocable pre-consultation links with hashed bearer tokens, versioned consent, durable throttling, immutable submissions, and clinician-only review.

## Verification

- Application: 29 test files and 76 tests pass.
- Database: 17 pgTAP files and 434 tests pass.
- ESLint, strict TypeScript, Prettier check, production build, and Supabase database lint pass.

## Important repository state

Local `main` and GitLab `origin/main` share the `7b29ded` checkpoint (`feat: expand operational dashboard metrics`). The worktree contains the uncommitted pre-consultation intake increment and this status update. GitLab exposes no additional branches, tags, or merge-request refs through the repository remote. Twilio Sandbox, packages, monthly reporting, Excel export, and the expanded dashboard are committed.

## Recommended next work

1. Add age- and sex-specific WHO paediatric growth-reference calculations without applying adult cut-offs to children.
2. Continue appointment operations with Google Calendar synchronization.
3. Review the nutritionist's response and approve a licensed regional food-data source before adding individual foods.
4. Configure and validate one Twilio Sandbox reminder, then complete a separate production consent, provider, and signed-webhook design before enabling patient delivery.

## Pending professional validation

Ask which food-composition table and edition are used in Guatemala, whether the workflow uses food exchanges/equivalents, which food groups and nutrients are required, and whether portions are recorded in grams, household measures, or both. Request a small representative sample of foods and portions. Confirm licensing, attribution, and permission for use inside commercial software before copying a dataset. The INCAP Central American food-composition table is a candidate, not yet an approved source.

## Resume instruction

Read this file, `docs/ROADMAP.md`, and the newest plan under `docs/plans/` before continuing. Verify `git status` and the latest commit. The next recommended product increment is paediatric growth-reference calculation. Food-data work resumes only after reviewing the nutritionist's answers and any source or licensing documents the user provides.
