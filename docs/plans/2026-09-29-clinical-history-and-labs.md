# Clinical history and laboratory results

Status: complete.

## Outcome

Nutrition professionals can maintain a patient's health and dietary history and record basic laboratory results from the clinical file.

## Scope

Included:

- Medical and family history, diagnoses, allergies, and current medications.
- 24-hour recall, eating habits, water, sleep, physical activity, preferences, and restrictions.
- Numeric laboratory results with unit, reference interval, collection date, and notes.
- Patient-file summary, dedicated editing workspace, validation, RLS, and audit events.

Excluded:

- Public intake links, coded diagnoses, document/image uploads, automatic laboratory interpretation, and external laboratory integrations.

## Context

- Product requirements: `docs/PRODUCT.md`.
- Security requirements: `docs/SECURITY.md`.
- Existing patient, anthropometry, consultation, and audit infrastructure.

## Data changes

- Add one health-history and one dietary-history row per patient.
- Add append-only laboratory result records.
- Add clinician-only RLS, audit triggers, and server-owned RPCs that derive organization ownership from the patient.
- Apply migrations incrementally without resetting local development data.

## Implementation steps

1. Add schema, RLS, RPCs, audit coverage, and pgTAP tests.
2. Add typed boundaries and validation tests.
3. Build clinical-history form, laboratory entry/list, and patient-file summary.
4. Run all application/database checks and production build.

## Security and privacy

- Only owners and nutritionists can read or mutate these records.
- Assistants and cross-organization users receive no clinical rows.
- Audit metadata contains identifiers, never clinical answers or values.
- Organization ownership is derived in PostgreSQL.
- Laboratory interpretation remains the professional's responsibility; the software stores values without diagnosing.

## Verification

- Valid histories can be saved and later updated without duplication.
- Validation errors preserve all entered fields.
- Laboratory rows retain value, unit, interval, date, and notes.
- Role and cross-organization tests pass.
- Lint, typecheck, tests, formatting, and production build pass.

## Progress log

- 2026-09-29: Plan created after the consultation workflow was validated by the user.
- 2026-09-29: Added health history, dietary history, and numeric laboratory result tables with clinician-only RLS, server-owned RPCs, and audit triggers.
- 2026-09-29: Added the unified patient history workspace, controlled forms that retain input on validation errors, and the laboratory history table.
- 2026-09-29: Applied the migration incrementally without resetting local development data.
- 2026-09-29: Passed 148 database tests and 31 application tests before the production-build verification.

## Decision log

- 2026-09-29: Keep health and dietary histories separate in storage but edit them in one clinical workspace.
- 2026-09-29: Store laboratory values as numeric MVP records and avoid automated interpretation.
