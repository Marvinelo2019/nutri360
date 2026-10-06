# Twilio WhatsApp Sandbox adapter

Status: implemented locally; awaiting Twilio credentials and live Sandbox validation.

## Outcome

Nutri360 can deliver one due WhatsApp appointment reminder at a time through the Twilio Sandbox to a single explicitly configured test recipient, while preserving the existing provider-neutral queue, retry ledger, and tenant isolation.

## Scope

Included:

- Server-only Twilio Sandbox credentials and strict environment validation.
- Organization- and recipient-scoped claiming so sandbox tests cannot message ordinary patients.
- Twilio's pre-approved Appointment Reminder content template with date and time only.
- Provider acceptance/failure recording through the existing immutable attempt ledger.
- Protected scheduler endpoint and an authenticated staff test control in the reminder center.
- Automated tests and setup instructions that never ask the user to paste credentials into chat or commit them.

Excluded:

- Production WhatsApp sender registration, custom Spanish templates, inbound replies, delivery-status webhooks, and patient-wide sending.
- Production opt-in management; Sandbox delivery is limited to the configured number that explicitly joins Twilio's test environment.

## Security and privacy

- The Sandbox recipient and credentials stay in `.env.local` and are never exposed to browser code or logs.
- The database claim requires the configured organization and exact E.164 recipient, and returns only the phone number plus appointment time needed for delivery.
- The template contains only appointment date and time; no patient name, diagnosis, plan, or clinical data.
- Raw Twilio responses and message bodies are not stored; only a provider SID or normalized error code enters the reminder ledger.
- Production rollout requires a separate consent and verified-webhook design review.

## Implementation steps

1. Add a scoped database claim RPC and pgTAP coverage.
2. Add environment validation, Twilio REST adapter, worker orchestration, and tests.
3. Enable the protected job route and a controlled manual test action in Agenda.
4. Document account setup and run all application/database verification gates.
5. Send one real Sandbox reminder after the user configures Twilio and joins the Sandbox.

## Progress log

- 2026-10-01: Twilio Sandbox selected for non-production WhatsApp validation.
- 2026-10-01: Added an organization- and recipient-scoped claim RPC, expiry protection, Twilio Appointment Reminder adapter, authenticated manual test control, and protected scheduled-worker route.
- 2026-10-01: Application lint, strict TypeScript, 61 tests, production build, and formatting pass. All 356 database tests and database lint pass.
- 2026-10-01: Awaiting the user's Twilio trial setup, Sandbox join, and local credentials before sending one real test reminder.

## Decision log

- 2026-10-01: Sandbox sends only to one allowlisted test number and one organization; it must never process the general patient queue.
- 2026-10-01: Use Twilio's official pre-approved Appointment Reminder template and keep the adapter behind the existing provider-neutral worker boundary.
