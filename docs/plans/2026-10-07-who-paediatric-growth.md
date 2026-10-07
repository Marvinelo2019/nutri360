# WHO paediatric growth references

Status: implementation complete; focused browser validation pending.

## Outcome

Nutrition professionals can record weight and height for a patient under 18 and receive reproducible, sex- and age-specific WHO growth-reference results without applying adult BMI cut-offs.

## Scope

Included:

- Exact age derivation from birth date and measurement date, with age in days for WHO 2006 and completed months for WHO 2007.
- WHO Child Growth Standards 2006 for children from birth through 60 months.
- WHO Growth Reference 2007 for children and adolescents from 61 through 228 months.
- BMI-for-age and length/height-for-age z-scores for the applicable paediatric range.
- Weight-for-age z-score through 120 months only; no weight-for-age result beyond age 10, following WHO guidance.
- Sex-specific official reference parameters, source/version metadata, immutable calculation snapshots, neutral Spanish presentation, and biological-plausibility warnings.
- Clinician-only server-side calculation, RLS, audit events, loading/error/empty states, and mobile patient-record integration.

Excluded:

- Diagnosis, treatment recommendations, prematurity correction, gestational age, oedema handling, head/arm circumference references, weight-for-length/height, growth velocity, percentile charts, and replacing professional judgement.
- Adult energy calculations for paediatric patients.

## Context

- Product and security requirements: `docs/PRODUCT.md`, `docs/SECURITY.md`, and phases 1–2 of `docs/ROADMAP.md`.
- The existing `record_adult_anthropometry` RPC rejects patients under 18 and stores immutable adult snapshots.
- Patients already record `birth_date` and a required sex reference when a sex-specific formula is needed.
- Authoritative sources are the WHO Child Growth Standards 2006 and WHO Growth Reference 2007 pages and official downloadable tables. Imported source files must be hash-recorded and transformed without manual transcription.
- WHO defines the 2007 reference as 61–228 months and does not provide weight-for-age beyond 10 years because pubertal height and body mass cannot be distinguished by that indicator.

## Data changes

- Add versioned WHO reference-parameter storage keyed by standard, indicator, sex, and age unit/value, populated from official WHO downloads.
- Extend anthropometric snapshots so adult-only columns can be null for paediatric records and add pathway, exact age, reference version, BMI-for-age, height-for-age, optional weight-for-age z-scores, classifications, and plausibility flags.
- Add a clinician-only `record_paediatric_anthropometry` RPC that derives patient identity, organization, birth date, sex, age, applicable reference, and z-scores in PostgreSQL.
- Preserve the existing adult RPC behavior and historical rows.
- The migration is forward-only. Local rollback uses `supabase db reset`; shared environments require a corrective migration.

## Implementation steps

1. Download the official WHO reference workbooks, record source URLs and SHA-256 hashes, and create a deterministic import artifact without hand-entered clinical values.
2. Add reference tables, snapshot columns, constraints, RLS, RPC calculation logic, classifications, and pgTAP coverage at age/sex/cut-off boundaries.
3. Update generated database types, Zod/server-action boundaries, and pure presentation tests.
4. Adapt the measurement form and history so the patient age selects the adult or paediatric pathway and clearly labels measured, calculated, and reference-derived values.
5. Update documentation and run application/database definition-of-done checks plus focused authenticated browser validation.

## Security and privacy

- Only active owners and nutritionists may record or read paediatric anthropometry.
- Organization and patient scope are derived from the authenticated database context; the browser supplies only patient ID, measured values, and measurement time.
- Birth date and sex reference are loaded from the protected patient record and never accepted as calculation authority from the browser.
- Reference data are global, read-only, versioned, and contain no patient information.
- Audit metadata contains identifiers and formula versions, never measurements or z-scores.
- Database constraints and the RPC reject future dates, age/reference mismatches, missing sex reference, invalid bounds, and duplicate or absent reference parameters.

## Verification

- Adult patients continue to use the unchanged adult BMI pathway.
- Patients under 18 never receive adult BMI classifications, normal-weight ranges, or adult body-fat estimates.
- WHO 2006 applies through 60 months and WHO 2007 from 61 through 228 months without a gap or overlap.
- BMI-for-age and height-for-age use sex-specific parameters; weight-for-age is absent after 120 months.
- Boundary z-scores and classifications match official WHO tables or endorsed computation examples within the documented rounding tolerance.
- Missing sex reference, invalid age, future measurement dates, and implausible inputs fail safely.
- Cross-organization users and assistants cannot read or create paediatric measurements.
- All repository definition-of-done commands pass.

## Progress log

- 2026-10-07: Plan created after user approval. Official WHO pages confirmed the 0–60 and 61–228 month reference split and the 120-month upper boundary for weight-for-age.
- 2026-10-07: Imported 11,934 LMS rows from 12 official WHO workbooks with recorded URLs and SHA-256 checksums through a deterministic generator.
- 2026-10-07: Added the protected paediatric calculation RPC, immutable snapshot fields, WHO pathway presentation, adult-path separation, and age-aware form behavior.
- 2026-10-07: Added 28 focused pgTAP assertions, including the official restricted-LMS example for an 11-year-old boy. All 462 database tests and all 78 application tests pass; lint, typecheck, formatting, production build, and database lint are clean.

## Decision log

- 2026-10-07: Store immutable calculation snapshots plus the exact WHO source/version so historical results remain reproducible if reference data or presentation rules later change.
- 2026-10-07: Keep patient-provided sex/gender separate from `growth_reference_sex`; only the explicit formula reference value selects sex-specific WHO parameters.
- 2026-10-07: Do not extrapolate weight-for-age beyond 120 months.
- 2026-10-07: Present z-scores as screening/reference indicators and avoid diagnostic language or alarmist color-only interpretation.
