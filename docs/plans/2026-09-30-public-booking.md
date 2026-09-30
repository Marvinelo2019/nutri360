# Public appointment booking

Status: complete locally and validated by the user in the browser.

## Outcome

Each clinic can configure public booking hours, enable a shareable `/reservar/[slug]` link, and receive conflict-safe pending appointments from new or existing patients without exposing the internal agenda.

## Scope

Included:

- Organization-level booking settings: enabled state, appointment duration, minimum notice, booking horizon, public instructions, and versioned privacy consent.
- Recurring availability windows per owner/nutritionist and one-off availability blocks.
- Staff configuration screen with the shareable link and schedule management.
- Public mobile-first slot selection and patient contact form.
- Transactional slot validation, patient matching/creation, pending appointment creation, audit events, and durable rate limiting.
- Loading, empty, invalid-link, conflict, success, and validation states.

Excluded:

- Appointment reminders, Google Calendar synchronization, cancellation/rescheduling links, payments, CAPTCHA, and patient authentication.
- Collecting clinical history, consultation reason, or other health information from the public form.
- Automatically confirming a public booking.

## Context

- Existing `appointments` records are organization scoped and protected by RLS and an exclusion constraint that rejects professional schedule overlap.
- Existing internal scheduling uses local clinic time and stores UTC timestamps.
- Public access must use purpose-built server-only operations; no organization-owned table is granted to anonymous database users.
- Product and security requirements live in `docs/PRODUCT.md`, `docs/SECURITY.md`, and `docs/ARCHITECTURE.md`.

## Data changes

- Add `public_booking_settings`, `availability_rules`, `availability_blocks`, and `public_booking_rate_limits`.
- Allow `created_by` to be null for patients and appointments created anonymously through the controlled public-booking function.
- Add public-booking source and privacy-consent snapshots to appointments.
- Add clinician-managed RPCs for settings, availability rules, and blocks.
- Add service-role-only RPCs for public context, slots, rate-limit consumption, and transactional booking.
- Apply RLS to every organization-owned table; keep rate-limit storage inaccessible to browser roles.
- Local rollback uses `supabase db reset`; shared environments use forward migrations.

## Implementation steps

1. Add schema, authorization, audit triggers, conflict validation, server-only public RPCs, and pgTAP coverage.
2. Add typed boundaries, Zod schemas, rate-limit fingerprinting, server actions, and data access.
3. Build the authenticated booking-configuration screen.
4. Build the public booking page and confirmation flow.
5. Update project documentation and run all application/database verification gates.

## Security and privacy

- The service-role key remains server-only; the public browser never talks directly to privileged RPCs.
- Public responses reveal only clinic branding, public instructions, professional display names, and currently bookable slots.
- Organization identity is resolved from the unique active slug; patient and appointment ownership is derived transactionally.
- Rate-limit keys are HMAC fingerprints; raw IP addresses, names, phone numbers, and emails are not logged or stored in rate-limit records.
- The public form collects only data required to identify/contact the patient and records a versioned privacy-consent snapshot.
- Errors do not disclose whether a patient, organization, or prior appointment exists.
- The database revalidates the exact slot and exclusion constraint at insertion time.

## Verification

- Disabled or unknown links return the same unavailable state.
- Only active owner/nutritionist memberships appear in availability.
- Slots respect clinic timezone, notice, horizon, recurring windows, blocks, and existing appointments.
- Tampered, stale, past, blocked, or overlapping slots are rejected transactionally.
- Public bookings create pending appointments and match only an exact organization/name/birth-date/phone patient identity.
- Anonymous roles cannot read booking configuration, availability tables, patients, or appointments.
- Rate limits reject excess availability and booking requests without storing raw network identifiers.
- Application tests, database tests/lint, formatting, type checking, and production build pass.

## Progress log

- 2026-09-30: Plan created after the user selected public booking as the next increment.
- 2026-09-30: Added organization booking settings, recurring professional availability, one-off blocks, privacy-consent snapshots, and server-only public operations.
- 2026-09-30: Added durable HMAC-fingerprint rate limiting, transactional slot revalidation, exact patient matching, and pending public appointments.
- 2026-09-30: Added the authenticated `/agenda/configuracion` workspace and mobile-first `/reservar/[slug]` flow with 14-day navigation.
- 2026-09-30: Passed 245 database tests, 50 application tests, database lint, ESLint, strict TypeScript, formatting, and the production build.
- 2026-09-30: Verified the unavailable-link response over local HTTP; valid-link browser validation remains pending.
- 2026-09-30: Diagnosed a server/browser `Intl` whitespace mismatch in public time labels that prevented the user's first form attempt from reaching the server. Moved all public slot label formatting to the server, normalized locale spacing, added regression coverage, and verified the real booking page returns stable labels including the 4:00 p. m. slot.
- 2026-09-30: Two later attempts returned a false success before rate limiting or database creation because the hidden honeypot could be populated by browser autofill. Removed the honeypot and retained durable server-side rate limiting as the abuse control.
- 2026-09-30: User completed a real public reservation, located the pending appointment on its correct future date in Agenda, and validated the end-to-end flow.

## Decision log

- 2026-09-30: Public bookings remain pending for clinic review rather than being automatically confirmed.
- 2026-09-30: Reuse the organization slug for the shareable URL and keep public database operations service-role-only.
- 2026-09-30: Require date of birth because the current patient identity model requires it; do not collect clinical fields in the booking form.
