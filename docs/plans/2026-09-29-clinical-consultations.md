# Clinical consultations

Status: complete.

## Outcome

Nutrition professionals can open a patient consultation, maintain structured SOAP notes as a draft, compare it with the previous consultation, and finalize an immutable clinical record.

## Scope

Included:

- Initial and follow-up consultation types.
- Consultation date, responsible professional, SOAP fields, and clinical summary.
- Draft editing and explicit finalization.
- Previous-consultation comparison on the consultation workspace.
- Patient-file consultation timeline and clinical access audit.

Excluded from this increment:

- Dietary-history questionnaire, laboratory results, diagnoses coding, signatures, PDF export, and patient visibility.
- Reopening or altering finalized consultations.

## Context

- Product and security requirements: `docs/PRODUCT.md` and `docs/SECURITY.md`.
- Existing patient, anthropometry, appointment, and meal-plan modules.
- Only owners and nutritionists may access consultation content.

## Data changes

- Add consultation type and status enums.
- Add organization- and patient-scoped consultations with SOAP content, author, timestamps, and finalization metadata.
- Add RLS, identity/finalization guards, audit triggers, and narrowly scoped RPCs for creation, draft updates, finalization, and audited reads.
- Apply the migration incrementally to preserve current local data. A local full rollback remains `supabase db reset`.

## Implementation steps

1. Add consultation schema, permissions, RPCs, and pgTAP coverage.
2. Add typed application boundaries and Zod validation.
3. Add patient timeline, consultation creation, editable SOAP workspace, previous-consultation comparison, and finalization.
4. Run database tests, application checks, production build, and protected-route checks.

## Security and privacy

- Assistants and patients cannot select or mutate consultation rows.
- Organization and patient ownership are derived in PostgreSQL, not accepted from browser state.
- Clinical reads and every mutation are audited without copying note content into audit metadata.
- Completed consultations are immutable; corrections require a later consultation rather than silent history changes.
- Clinical content is never written to application logs.

## Verification

- Owners and nutritionists can create, update, compare, and finalize consultations in their organization.
- Assistants and cross-organization users see zero rows and cannot execute clinical RPCs.
- Drafts remain editable and completed records reject updates.
- Finalization requires clinically meaningful content.
- Validation errors retain the user's SOAP entries.
- Lint, typecheck, application tests, database tests, formatting, and production build pass.

## Progress log

- 2026-09-29: Created the implementation plan after completing structured meal plans and payments.
- 2026-09-29: Added consultation drafts, structured SOAP notes, finalization locking, clinical audit events, and cross-organization/role tests.
- 2026-09-29: Added the patient consultation timeline, creation screen, SOAP workspace, prior-consultation comparison, and read-only completed view.
- 2026-09-29: Applied both migrations incrementally without resetting local development data.
- 2026-09-29: Passed 127 database tests, application checks, formatting, and the production build.

## Decision log

- 2026-09-29: Use explicit draft and completed states so validation or interruptions never lose clinical notes.
- 2026-09-29: Keep finalized consultations immutable to preserve a trustworthy clinical timeline.
