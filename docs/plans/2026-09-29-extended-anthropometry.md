# Extended anthropometry and progress

Status: complete.

## Outcome

Nutritionists can record optional circumferences and skinfolds alongside adult weight and height, calculate waist-to-hip ratio, and view longitudinal weight and waist progress.

## Scope

- Waist, hip, arm, thigh, calf, triceps, subscapular, suprailiac, and abdominal measurements.
- Waist-to-hip ratio only when both inputs exist.
- Weight and waist trend visualization.
- No unvalidated skinfold body-fat formula or paediatric interpretation.

## Security and verification

The existing clinician-only RLS and audit trail apply. Inputs are bounded at the UI and database. Database and application checks plus production build must pass.

## Progress log

- 2026-09-29: Plan created after clinical history validation.
- 2026-09-29: Added optional circumferences and four skinfold sites, database-calculated waist-to-hip ratio, expanded entry form, waist history, and weight/waist trend charts.
- 2026-09-29: Passed 150 database tests and 31 application tests.
