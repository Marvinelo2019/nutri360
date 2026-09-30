# Current project status

Last updated: 2026-09-30.

## Current checkpoint

The adult energy and macronutrient calculation increment is complete locally, validated by the user in the browser, and included in the current Git checkpoint. The local Supabase migration `20260930003000_energy_calculations.sql` is applied.

## Completed locally

- Foundation, authentication, organization tenancy, RLS, and audit infrastructure.
- Patients, consent, adult anthropometry, extended circumferences/skinfolds, and progress charts.
- Internal appointments and controlled status lifecycle.
- Structured meal-plan drafts, items, activation, and immutable published plans.
- Payments and organization-local monthly totals.
- SOAP consultations, clinical histories, dietary histories, and laboratory results.
- Adult energy calculations using Mifflin-St Jeor (1990), revised Harris-Benedict / Roza-Shizgal (1984), and FAO/WHO/UNU (1985).
- Activity and goal adjustment, macro distribution by percentage or g/kg, immutable calculation history, and meal-plan target prefill.

## Verification

- Application: 14 test files and 40 tests pass.
- Database: 8 pgTAP files and 181 tests pass.
- ESLint, strict TypeScript, Prettier check, production build, and Supabase database lint pass.

## Important repository state

The completed meal-plan, payment, consultation, history, extended-anthropometry, and energy-calculation increments are consolidated in the current clinical-planning checkpoint on `main`.

## Recommended next work

1. Implement food groups and configurable equivalents.
2. Add a validated local food dataset and nutrient-aware meal items.
3. Add reusable meal-plan templates and private branded PDF generation.

## Resume instruction

Read this file, `docs/ROADMAP.md`, and the newest plan under `docs/plans/` before continuing. Verify `git status` and the latest commit before starting the next increment.
