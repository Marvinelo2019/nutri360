# Google Calendar synchronization

Status: implementation complete; live OAuth, free/busy, and two-event export browser-validated. Cancellation, public conflict, disconnect, and production scheduling remain pending.

## Outcome

Each owner or nutritionist can connect their own Google account, have future Nutri360 appointments reflected in their primary Google Calendar, and use Google busy periods to reduce double-booking in the public booking flow without exposing patient identity or clinical information to Google.

## Scope

Included:

- Per-professional Google OAuth 2.0 web-server authorization with offline access and one active connection per organization/user.
- Primary-calendar synchronization for appointment creation and Nutri360 cancellation/rescheduling.
- Generic Google event content with no patient name, contact information, clinical reason, notes, or diagnosis.
- Periodic Google free/busy refresh into organization-scoped busy intervals used by public slot generation and internal appointment creation.
- Durable, idempotent outbound jobs, bounded retries, connection health, manual sync, disconnect/revoke flow, and audit events.
- Owner/nutritionist configuration UI, loading/error/empty states, server-only credentials, encrypted refresh tokens, and synthetic automated tests.

Excluded:

- Importing Google event titles, descriptions, attendees, or other event content.
- Letting Google-side edits mutate Nutri360 appointment times, patients, or statuses.
- Creating Google Meet links, inviting patients, recurring Nutri360 appointments, shared-calendar selection, webhook push channels, or domain-wide delegation.
- Guaranteeing real-time conflict prevention between periodic free/busy refreshes.

## Context

- Product scope and sequencing: `docs/PRODUCT.md` and phase 3 of `docs/ROADMAP.md`.
- Security requirements: `docs/SECURITY.md`; calendar credentials and authorization codes are secrets and must never reach browser JavaScript, logs, audit metadata, or Git.
- Appointments are organization-scoped, timezone-aware, audited, and schedule-immutable in `20260929230000_internal_appointments.sql`.
- Public availability is generated transactionally in PostgreSQL from availability rules, blocks, and existing appointments.
- Calendar work must not block appointment creation, per `docs/ARCHITECTURE.md`.
- Google recommends the OAuth web-server flow for confidential server applications, offline access for background work, narrow scopes, and custom event IDs for idempotent creation.

## Data changes

- Add a private-by-default `google_calendar_connections` table keyed by organization and professional user, containing encrypted refresh-token material, granted scopes, Google account metadata, health, timestamps, and a token version.
- Add one-time hashed OAuth state records with expiry and consumption timestamps.
- Add `calendar_sync_jobs` with one current desired operation per appointment, lease fields, retry state, and idempotency keys.
- Add appointment-to-Google event mappings with deterministic event IDs and last successful operation metadata.
- Add replaceable `google_calendar_busy_periods` for a bounded future horizon; never store Google titles or attendees.
- Add security-definer functions for authorized connection summaries, job enqueue/claim/complete/fail, busy-period replacement, connection lifecycle, and organization-scoped audit events.
- Update public slot generation and internal appointment creation to reject overlap with fresh Google busy periods.
- Migration is forward-only. Local rollback uses `supabase db reset`; shared environments require a corrective migration.

## Implementation steps

1. Add schema, RLS, triggers, queue/lease functions, connection lifecycle functions, busy-period conflict checks, and pgTAP coverage.
2. Add server-only OAuth, token encryption/refresh, Google Calendar event/free-busy clients, deterministic event IDs, and unit tests using mocked HTTP responses.
3. Add OAuth start/callback routes and a protected calendar worker endpoint using existing scheduler-secret conventions.
4. Add connection status, connect, manual-sync, and disconnect controls to agenda configuration.
5. Add configuration documentation, update generated database types and project status, then run all application/database checks.
6. After Google Cloud test credentials are supplied, validate authorization, event creation/cancellation, busy-period blocking, token refresh, and disconnect in a synthetic account.

## Security and privacy

- Request only the scopes required to manage events on calendars the professional owns and query free/busy availability.
- Store the Google client secret and token-encryption key only in server environment variables.
- Encrypt refresh tokens with authenticated encryption before database storage; never persist access tokens unless encrypted and necessary.
- Hash OAuth state values, make them single-use and short-lived, bind them to the authenticated user and organization, and require an active owner/nutritionist membership at callback time.
- Calendar events use a generic title such as `Cita Nutri360`; no patient identifiers or health data leave Nutri360.
- Google free/busy responses are reduced to start/end timestamps; event content is never requested or stored.
- Browser roles receive no direct table privileges for connections, secrets, OAuth state, jobs, mappings, or busy periods.
- Workers use leases, idempotent event IDs, bounded retries, sanitized error codes, and no secret-bearing logs.
- Disconnect revokes Google authorization when possible, deletes encrypted credentials, and stops future synchronization without deleting Nutri360 appointments.

## Verification

- Owner/nutritionist can connect only their own account; assistants and cross-organization users cannot connect, inspect, sync, or disconnect it.
- OAuth state replay, expiry, user mismatch, missing refresh token, insufficient scopes, and malformed callbacks fail safely.
- The same appointment/job can be retried without duplicate Google events.
- Cancellation/rescheduling in Nutri360 removes the mapped Google event; completed/no-show history remains stable.
- Appointment mutations succeed even when Google is unavailable; failed jobs retry without blocking clinical operations.
- Google busy intervals suppress overlapping public slots and internal appointment creation only while the snapshot is fresh.
- No Google event or audit metadata contains patient name, contact, reason, notes, or clinical data.
- Disconnect removes credentials and future jobs but preserves auditability and Nutri360 records.
- Application lint, strict typecheck, unit tests, formatting, build, all pgTAP files, and Supabase database lint pass.

## Progress log

- 2026-10-07: Plan created after user approval. Repository appointment, booking, reminder, security, and architecture boundaries reviewed.
- 2026-10-07: Official Google documentation reviewed for OAuth web-server authorization, offline refresh tokens, narrow Calendar scopes, event creation, deterministic event IDs, and incremental synchronization behavior.
- 2026-10-07: Added private connection/state/mapping/outbox/free-busy tables, RLS, role checks, auditing, fresh-busy conflict guards, and 37 focused pgTAP assertions.
- 2026-10-07: Added server-only OAuth routes, AES-256-GCM token encryption, deterministic generic event synchronization, free/busy reduction, leased worker processing, manual sync/disconnect controls, and setup documentation.
- 2026-10-07: All 499 database tests and all 84 application tests pass; lint, typecheck, formatting, production build, and database lint are clean. Live Google validation remains intentionally pending until test credentials are provided outside the repository.
- 2026-10-07: Live OAuth and free/busy synchronization succeeded. Event export exposed a missing database grant: the service worker could claim jobs but could not read appointment timing. Added a corrective migration granting `service_role` select access only to appointment identity, organization, and start/end columns; patient and clinical columns remain unavailable through this grant.
- 2026-10-07: Applied the corrective migration locally and retried the two existing jobs. Both completed successfully, produced two appointment-event mappings, and cleared their sanitized error state. All 504 database assertions and 84 application tests pass; lint, typecheck, formatting, production build, and database lint are clean.
- 2026-10-07: User confirmed in the browser that both synthetic appointments appear and synchronize correctly in Google Calendar. Local synchronization remains manual through **Sincronizar ahora**; a five-minute recurring worker will be configured with the eventual deployment provider.

## Decision log

- 2026-10-07: Nutri360 remains the appointment source of truth. Google-side edits do not mutate patient or appointment records.
- 2026-10-07: Use the professional's primary calendar in the first increment; shared-calendar selection is deferred.
- 2026-10-07: Export generic events and import only free/busy intervals, never Google event content.
- 2026-10-07: Use deterministic Google event IDs plus a durable outbox so retries cannot create duplicate events.
- 2026-10-07: Use application-layer authenticated encryption for refresh tokens and keep the encryption key outside the database and repository.
- 2026-10-07: Keep local development synchronization explicit and defer the recurring five-minute worker configuration until the deployment platform is selected.
