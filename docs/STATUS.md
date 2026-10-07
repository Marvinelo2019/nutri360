# Current project status

Last updated: 2026-10-07.

## Current checkpoint

Public booking, reusable meal-plan templates, private branded meal-plan PDF generation, the provider-neutral appointment reminder center, consultation packages, the session-consumption ledger, monthly operational reporting, Excel export, and the expanded dashboard are complete and committed to `main`.

The secure pre-consultation intake increment is complete and browser-validated. Clinicians can create expiring single-use links, revoke unused invitations, and review immutable patient submissions without automatically overwriting the professional clinical history. The validated flow created a link, registered patient answers, rejected reuse of the completed link, and created a second working invitation.

The WHO paediatric growth-reference increment is complete and browser-validated. The user registered the suggested under-five and adolescent test patients, entered their weight and height, and confirmed the age-aware WHO messages in both records. For patients under 18, weight and height produce sex- and age-specific BMI-for-age and height-for-age z-scores using WHO 2006 (through 60 months) or WHO 2007 (from 61 months); weight-for-age is included only through 120 months. Results preserve the exact age, source version, classifications, plausibility flags, and calculation pathway without applying adult BMI cut-offs or presenting the output as a diagnosis.

The privacy-preserving Google Calendar synchronization increment is complete. Live browser testing validated OAuth connection, Google free/busy refresh, and correct export of two synthetic appointments after correcting the worker's least-privilege access to appointment timing. The user confirmed that both events synchronize correctly in Google Calendar. Each owner or nutritionist can connect their own primary calendar; Nutri360 exports generic private events without patient identity, imports only free/busy timestamps, blocks fresh conflicts in internal and public scheduling, and processes changes through an idempotent retryable worker. Google-side edits never mutate Nutri360 patient or appointment records. Local development currently requires **Sincronizar ahora**; automatic processing every five minutes remains a deployment task. Live cancellation, public-slot conflict, and disconnect checks remain pending.

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
- Versioned WHO 2006/2007 paediatric growth references imported from 12 checksum-verified official workbooks, with clinician-only server calculation, immutable snapshots, RLS, role separation, and neutral Spanish presentation.
- Per-professional Google Calendar OAuth, AES-256-GCM refresh-token encryption, generic event synchronization, free/busy conflict protection, durable worker leases/retries, manual synchronization, disconnect/revocation, and assistant/cross-organization denial.

## Verification

- Application: 32 test files and 84 tests pass.
- Database: 19 pgTAP files and 504 tests pass.
- ESLint, strict TypeScript, Prettier check, production build, and Supabase database lint pass.

## Important repository state

The paediatric validation checkpoint is `4df1306` (`docs: record paediatric growth validation`). The initial Google Calendar implementation checkpoint is `278c451` (`feat: add Google Calendar synchronization`); the live worker correction follows it in repository history.

## Recommended next work

1. Finish the synthetic Google Calendar rehearsal by validating cancellation, public-slot conflict protection, and disconnect behavior; configure the five-minute worker schedule after choosing the deployment provider.
2. Review the nutritionist's response and approve a licensed regional food-data source before adding individual foods.
3. Configure and validate one Twilio Sandbox reminder, then complete a separate production consent, provider, and signed-webhook design before enabling patient delivery.

## Pending professional validation

Ask which food-composition table and edition are used in Guatemala, whether the workflow uses food exchanges/equivalents, which food groups and nutrients are required, and whether portions are recorded in grams, household measures, or both. Request a small representative sample of foods and portions. Confirm licensing, attribution, and permission for use inside commercial software before copying a dataset. The INCAP Central American food-composition table is a candidate, not yet an approved source.

## Resume instruction

Read this file, `docs/ROADMAP.md`, `docs/GOOGLE_CALENDAR.md`, and the newest plan under `docs/plans/` before continuing. Verify `git status` and the latest commit. The next action is completing the remaining synthetic cancellation, public-conflict, and disconnect checks. The recurring Calendar worker is configured only when the deployment provider is selected; local testing uses **Sincronizar ahora**. Food-data work resumes only after reviewing the nutritionist's answers and any source or licensing documents the user provides.
