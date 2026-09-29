# Patients and initial anthropometry

Status: complete.

## Outcome

An authorized nutrition professional can register a patient with consent, find them quickly, open a protected profile, and record reproducible adult weight-and-height assessments with history.

## Scope

Included:

- Patient administrative record, clinical profile, versioned consent, and anthropometric measurement history.
- Role-separated RLS for owner, nutritionist, and assistant.
- Audited clinical reads and mutations.
- Patient list, local search, registration, profile summary, and adult weight/height calculator.
- Versioned BMI, adult BMI classification, normal-BMI weight interval, unit conversion, and optional Deurenberg estimate.

Excluded:

- Paediatric growth-reference calculations, intake links, SOAP notes, laboratories, circumferences, and skinfolds.
- Patient portal access and deletion/export workflow UI.
- Outreach-event administration.
- An approved single-number “ideal weight” formula.

## Context

- Product scope: `docs/PRODUCT.md`.
- Security baseline: `docs/SECURITY.md`.
- Source behavior: `docs/references/peso-talla.md`.
- Existing tenancy helpers: `supabase/migrations/20260929190000_identity_and_tenancy.sql`.
- The patient list contains identifying information and remains authenticated and organization-scoped.

## Data changes

A forward migration adds patient status/reference enums, `patients`, `patient_clinical_profiles`, `patient_consents`, and `anthropometric_measurements`, plus indexes, RLS, immutable identity guards, audit triggers, and narrowly scoped RPCs for transactional registration, audited clinical reads, and server-owned adult calculations.

Local rollback uses `supabase db reset`. Shared environments use a later forward migration rather than destructive rollback.

## Implementation steps

1. Add schema, grants, policies, RPCs, and cross-role pgTAP tests.
2. Generate/update typed Supabase boundaries and add pure formula tests.
3. Build patient list/search and registration with consent.
4. Build patient profile, adult calculation preview, save operation, and measurement history.
5. Enable patient navigation and verify desktop/mobile states.
6. Run all application and database checks plus production build.

## Security and privacy

- Organization scope is derived from active membership and patient ownership in PostgreSQL.
- Assistants can access administrative patient fields but cannot read clinical profiles or anthropometry.
- Clinical reads call an audited database operation.
- Clinical formulas and saved outputs are calculated by PostgreSQL, not accepted from browser payloads.
- Consent is versioned and append-oriented; withdrawals are explicit.
- No patient values are logged or placed in query strings.
- Synthetic fixtures only are used in tests.

## Verification

- Cross-organization users see zero patient rows.
- Assistants can register/read administrative details but cannot read clinical data or measurements.
- Nutritionists can register patients and record adult measurements.
- Under-18 patients are rejected by the adult measurement RPC.
- Historical measurements are inserted, never overwritten.
- Invalid bounds are rejected at server and database boundaries.
- Formula tests cover boundary classifications and regional units.
- Application checks, database tests/lint, build, and protected-route HTTP checks pass.

## Progress log

- 2026-09-29: Plan created and role/data boundaries established from the approved patient-first sequence.
- 2026-09-29: Implemented patient registration, consent, directory/search, protected profile, adult measurements, history, navigation, and live dashboard count.
- 2026-09-29: Passed 43 database tests, 14 application tests, lint, typecheck, formatting, and a production webpack build.

## Decision log

- 2026-09-29: Separate administrative patient identity from clinical profile fields so assistant access does not expose clinical goals or consultation reasons.
- 2026-09-29: Defer paediatric calculations until WHO reference data and exact age-in-months behavior are implemented and validated.
- 2026-09-29: Do not implement the mismatched “Devine” calculation from the reference resource.
- 2026-09-29: Keep the browser preview informational; PostgreSQL remains authoritative for every saved anthropometric result.
