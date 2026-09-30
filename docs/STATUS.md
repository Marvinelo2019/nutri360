# Current project status

Last updated: 2026-09-30.

## Current checkpoint

The food-groups and configurable-equivalents increment is complete locally and validated by the user in the browser. Explanatory copy was improved after usability feedback. The local Supabase migration `20260930003100_food_groups_and_equivalents.sql` is applied. The prior clinical-planning work is preserved in the current Git checkpoint.

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

## Verification

- Application: 16 test files and 46 tests pass.
- Database: 9 pgTAP files and 211 tests pass.
- ESLint, strict TypeScript, Prettier check, production build, and Supabase database lint pass.

## Important repository state

The completed food-groups/equivalents increment is preserved in the latest checkpoint on `main`. The preceding meal-plan, payment, consultation, history, extended-anthropometry, and energy-calculation increments remain consolidated in the prior clinical-planning checkpoint.

## Recommended next work

1. Select and validate a regional food-data source before adding individual foods.
2. Add a validated local food dataset and nutrient-aware meal items.
3. Add reusable meal-plan templates and private branded PDF generation.

## Resume instruction

Read this file, `docs/ROADMAP.md`, and the newest plan under `docs/plans/` before continuing. Verify `git status` and the latest commit before starting the next increment.
