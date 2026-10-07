# Secure pre-consultation intake

Status: complete and browser-validated.

## Outcome

A nutrition professional can create an expiring intake link for an existing patient, share it outside Nutri360, and review the patient's single-use submission from the clinical record before the consultation.

## Scope

Included:

- Clinician-created invitations tied to one organization and patient.
- Cryptographically random bearer tokens stored only as SHA-256 hashes.
- Configurable expiration, explicit revocation, and one successful submission per invitation.
- A Spanish-first mobile public form for health history, allergies, medications, dietary recall, habits, water, sleep, physical activity, preferences, and restrictions.
- Versioned consent captured with the immutable submission.
- Clinician-only invitation history and submitted-answer review in the patient history workspace.
- Server-boundary Zod validation, durable request throttling, audit events, loading/error/unavailable/success/empty states, and tenant/role tests.

Excluded:

- Email or WhatsApp delivery of the link, patient authentication, file uploads, diagnoses, laboratory data, automatic interpretation, and automatic replacement of clinician-maintained history.
- Editing a completed submission or reusing/reopening its token.

## Context

- Product and acceptance requirements: `docs/PRODUCT.md`, `docs/SECURITY.md`, and phase 1 of `docs/ROADMAP.md`.
- Existing clinician-maintained records live in `patient_health_histories` and `dietary_histories`.
- Public booking already provides server-only privileged access and durable HMAC request throttling patterns.
- Patient-submitted answers remain a distinct immutable source until a professional reviews them; they must not silently overwrite the clinical record.

## Data changes

- Add `intake_invites` with organization/patient ownership, token hash, consent version, expiry, completion/revocation state, creator, and timestamps.
- Add `intake_submissions` with one immutable response per invitation, organization/patient ownership, health and dietary answers, consent snapshot, and submission timestamp.
- Add clinician-only RLS policies, grants, audit triggers, immutable identity/content guards, indexes, and composite tenant-safe foreign keys.
- Add authenticated RPCs to create and revoke invitations plus service-role-only RPCs to resolve and submit a public intake atomically.
- Reuse the existing durable server-side public request limiter with scopes derived from token hashes, never raw tokens.
- The migration is forward-only. Local rollback uses `supabase db reset`; shared environments require a corrective migration.

## Implementation steps

1. Add schema, constraints, RLS, audit/immutability controls, public and authenticated RPCs, and pgTAP coverage.
2. Refresh database types and add token, validation, data-access, and server-action boundaries.
3. Build clinician invitation controls and immutable submission review in the patient history workspace.
4. Build the public intake route and accessible mobile form with unavailable, validation, success, and throttled states.
5. Update product status/data-model documentation and run application/database definition-of-done checks plus focused browser validation.

## Security and privacy

- Raw bearer tokens are returned once to the creating clinician and never stored, logged, audited, or placed in database error text.
- Public access uses the service-role client only at a server boundary; anonymous roles receive no table or RPC access.
- Token lookup returns only clinic presentation data and the consent version, not patient identity or prior clinical information.
- Submission validates expiry, revocation, prior use, organization/patient ownership, field lengths, and consent inside one database transaction.
- Staff access is limited to active owners and nutritionists in the invitation's organization; assistants cannot create or read clinical intake content.
- Audit metadata contains identifiers and state transitions only, never answers or token hashes.
- Rate-limit scopes use a short derived token-hash identifier plus an HMAC request fingerprint; raw IP addresses and tokens are not stored.

## Verification

- Cross-organization and assistant users cannot create, revoke, read, or review intake records.
- Unknown, expired, revoked, or completed links return the same unavailable state and disclose no patient existence.
- Concurrent or repeated submissions produce exactly one immutable response.
- Invalid or oversized fields are rejected at both application and database boundaries.
- Consent version and acceptance time are retained with the submission.
- Public submission never overwrites clinician-maintained histories.
- Relevant loading, error, empty, validation, and success states work at mobile width.
- Lint, strict TypeScript, application tests, formatting, production build, database reset/tests, and database lint pass.

## Progress log

- 2026-10-07: Plan created. Selected immutable patient-submitted answers with explicit clinician review rather than automatic clinical-history replacement.
- 2026-10-07: Added hashed-token invitations, bounded expiration, revocation, immutable submissions, consent snapshots, clinician-only RLS, audited state changes, and service-role-only public RPCs.
- 2026-10-07: Added clinician invitation/review UI and the mobile public `/preconsulta/[token]` form with unavailable, validation, success, loading, and empty states.
- 2026-10-07: Applied migration `20261007000100_pre_consultation_intake.sql` locally. All 434 database tests and database lint pass.
- 2026-10-07: Application lint, strict TypeScript, 76 tests, formatting, and production build pass.
- 2026-10-07: User completed authenticated browser validation: created a link, submitted patient information, confirmed the answers were registered, verified the same link became unavailable after use, and generated a second working link.

## Decision log

- 2026-10-07: Use opaque 256-bit bearer tokens and store only SHA-256 hashes.
- 2026-10-07: Keep intake submissions immutable and distinct from clinician-authored history to preserve provenance and avoid unreviewed clinical changes.
- 2026-10-07: Do not display patient identity on the public route; possession of the scoped link is sufficient to complete the form without adding identity data to the page.
