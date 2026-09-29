# Internal appointments

Status: complete.

## Outcome

Clinic staff can schedule a patient with an active nutrition professional, inspect a Guatemala-local daily agenda, and move the appointment through a controlled operational status lifecycle without double-booking the professional.

## Scope

Included:

- Organization-owned appointments linked to patients and professional memberships.
- In-person, video, and phone modalities.
- Daily agenda navigation, appointment creation, and status actions.
- Database-enforced time bounds, role authorization, status transitions, audit history, and overlap prevention.
- Dashboard count for today's non-cancelled appointments.

Excluded:

- Public booking links, recurring availability, blocked periods, reminders, messaging, Google Calendar, and rescheduling into a replacement appointment.
- Clinical notes or reasons for consultation inside the administrative appointment record.

## Context

- Product requirements: `docs/PRODUCT.md`.
- Security requirements: `docs/SECURITY.md`.
- Existing tenancy and patient migrations under `supabase/migrations/`.
- The initial deployment uses `America/Guatemala`; database operations derive UTC boundaries from the organization timezone.

## Data changes

A forward migration adds appointment status and modality enums, the `appointments` table, a database exclusion constraint for professional time collisions, RLS, audit triggers, and narrowly scoped RPCs for creation, status changes, and local-day listing.

Local rollback uses `supabase db reset`. Shared environments receive later forward migrations.

## Implementation steps

1. Add appointment schema, constraints, RLS, audited RPCs, and pgTAP coverage.
2. Add typed application boundaries, schemas, date utilities, and unit tests.
3. Build the daily agenda and appointment creation flow.
4. Add controlled status actions and live dashboard counts.
5. Run formatting, application checks, database tests, production build, and protected-route HTTP checks.

## Security and privacy

- Organization membership is checked by PostgreSQL for every operation.
- Assistants can manage appointment administration but cannot gain access to clinical tables.
- Patient and professional organization relationships are verified transactionally.
- No clinical reason or note is stored in the appointment table.
- Changes are recorded in the immutable organization audit stream.
- Database exclusion prevents concurrent double-booking attempts.

## Verification

- Cross-organization staff see no appointments.
- Assistants can schedule and update operational status.
- Only active owner/nutritionist memberships can be assigned as professionals.
- Overlapping active appointments for one professional fail atomically.
- Back-to-back appointments and simultaneous appointments for different professionals succeed.
- Invalid transitions and invalid durations are rejected.
- Local-day boundaries use the organization timezone.
- Application checks, database tests, build, and protected-route checks pass.

## Progress log

- 2026-09-29: Plan created; internal agenda selected as the first operations slice.
- 2026-09-29: Added appointment schema, collision prevention, role-aware RPCs, daily agenda, scheduling form, status actions, and dashboard integration.
- 2026-09-29: Passed 61 database tests, 19 application tests, lint, typecheck, formatting, production build, and protected-route HTTP checks.

## Decision log

- 2026-09-29: Keep appointment data administrative so assistants can operate the agenda without clinical-record access.
- 2026-09-29: Use an exclusion constraint instead of an application pre-check to prevent race-condition double bookings.
- 2026-09-29: Defer public booking and reminders until abuse controls and provider infrastructure exist.
- 2026-09-29: Use the organization timezone inside PostgreSQL when converting local appointment input and selecting a local calendar day.
- 2026-09-29: Use the stable Next.js webpack production builder while retaining the standard development server, avoiding Turbopack process-binding failures in the current execution environment.
