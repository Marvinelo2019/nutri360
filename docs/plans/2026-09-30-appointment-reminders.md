# Appointment reminder queue

Status: complete and browser-validated.

## Outcome

Every appointment automatically receives a reconcilable confirmation and eligible 24-hour/2-hour reminder schedule, staff can inspect its state, and a server-only worker can safely claim and complete deliveries once a messaging provider is configured.

## Scope

Included:

- Organization reminder settings for confirmation, 24-hour reminder, 2-hour reminder, and preferred delivery channel.
- Transactional reminder creation for staff and public appointments without copying patient contact data into the queue.
- Automatic cancellation when an appointment reaches a final status.
- Idempotent claiming, leases, bounded retries, immutable delivery attempts, and provider identifiers.
- Staff reminder center with pending/sent/failed/cancelled states and missing-contact visibility.
- Server-only worker boundary and provider-neutral message payloads.

Excluded until a provider is chosen:

- Live WhatsApp, SMS, or email transmission; provider credentials; approved WhatsApp templates; inbound replies; and delivery-status webhooks.
- Calendar synchronization and patient-portal notifications.

## Context

- Appointments can originate from authenticated staff or anonymous public booking and use immutable UTC schedules.
- Patients currently store optional `phone_e164` and email contact fields.
- `docs/ARCHITECTURE.md` requires explicit scheduled timestamps, idempotent claiming, provider identifiers, and retry handling in server-only jobs.
- Selecting WhatsApp, SMS, or email changes costs, account requirements, message templates, and webhook verification, so provider-specific delivery remains a separate decision.

## Data changes

- Add reminder enums, organization settings, `appointment_reminders`, and immutable `reminder_delivery_attempts`.
- Add appointment-triggered scheduling/cancellation and default settings for existing/new organizations.
- Add staff RLS for read/configuration and service-role-only claim/completion RPCs.
- Backfill future non-final appointments without duplicating jobs.
- Local rollback uses `supabase db reset`; shared environments use a forward migration.

## Implementation steps

1. Add schema, triggers, backfill, RPCs, RLS, and pgTAP coverage.
2. Add TypeScript boundaries and presentation helpers.
3. Add reminder settings and operational queue interfaces under Agenda.
4. Add a server-only worker contract that refuses delivery until provider configuration is complete.
5. Run all verification gates and validate scheduling/cancellation in the browser.

## Security and privacy

- Queue rows reference appointment/patient IDs and never duplicate names, phone numbers, email addresses, or message bodies.
- Only active staff in the organization can inspect reminders; only owners/nutritionists change settings.
- Claim/completion functions are unavailable to browser roles and use short leases plus worker tokens.
- Provider errors are normalized codes; raw responses and message content are not stored or logged.
- A future webhook must verify the provider signature before updating delivery state.

## Verification

- Staff and public appointments create one reminder per enabled kind, respecting future scheduled times.
- Final appointment statuses cancel unsent reminders.
- Repeated scheduling and worker claims do not duplicate jobs or simultaneous delivery.
- Failed jobs retry up to the configured maximum and retain immutable attempts.
- Assistants can inspect operations but cannot change settings; outsiders see no rows.
- Application checks, database tests/lint, formatting, and production build pass.
- User validates the reminder center before the checkpoint.

## Progress log

- 2026-09-30: Plan created after branded PDF checkpoint `654d1b2`.
- 2026-09-30: Added migration `20260930003500_appointment_reminders.sql` with organization settings, transactional scheduling/cancellation, RLS, idempotent leases, bounded retries, and immutable delivery attempts.
- 2026-09-30: Added Agenda reminder center, owner/nutritionist configuration, assistant read-only behavior, missing-contact visibility, and a scheduler-secret-protected endpoint that refuses to claim work until a provider is configured.
- 2026-09-30: Application lint, strict TypeScript, 60 tests, production build, and formatting pass. All 346 database tests and database lint pass.
- 2026-09-30: Awaiting user validation of the reminder center before creating the Git checkpoint.
- 2026-09-30: User confirmed the reminder center loads and looks correct; checkpoint approved.

## Decision log

- 2026-09-30: Build the provider-neutral, idempotent queue before selecting an external messaging vendor.
- 2026-09-30: Do not store contact details or rendered message bodies in reminder rows or attempt logs.
