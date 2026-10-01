# Current project status

Last updated: 2026-09-30.

## Current checkpoint

Public booking, reusable meal-plan templates, private branded meal-plan PDF generation, and the provider-neutral appointment reminder center are complete and browser-validated. Migration `20260930003500_appointment_reminders.sql` is applied locally.

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

## Verification

- Application: 22 test files and 60 tests pass.
- Database: 13 pgTAP files and 346 tests pass.
- ESLint, strict TypeScript, Prettier check, production build, and Supabase database lint pass.

## Important repository state

The completed and browser-validated public-booking, reusable-template, branded PDF, and appointment-reminder increments are preserved in consecutive feature checkpoints on `main`.

## Recommended next work

1. Review the nutritionist's response and select a regional food-data source before adding individual foods.
2. Choose the first live reminder channel and provider before enabling outbound messages.
3. Continue appointments with Google Calendar synchronization or add patient-portal access when phase 4 begins.

## Pending professional validation

Ask which food-composition table and edition are used in Guatemala, whether the workflow uses food exchanges/equivalents, which food groups and nutrients are required, and whether portions are recorded in grams, household measures, or both. Request a small representative sample of foods and portions. Confirm licensing, attribution, and permission for use inside commercial software before copying a dataset. The INCAP Central American food-composition table is a candidate, not yet an approved source.

## Resume instruction

Read this file, `docs/ROADMAP.md`, and the newest plan under `docs/plans/` before continuing. Verify `git status` and the latest commit. Food-data work resumes only after reviewing the nutritionist's answers and any source or licensing documents the user provides.
