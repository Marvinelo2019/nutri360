# Security and privacy baseline

Nutri360 handles health information. These controls are MVP requirements, not later enhancements.

## Mandatory controls

- Enforce HTTPS in deployed environments.
- Apply Row Level Security to every organization-owned table.
- Derive `organization_id` from the authenticated membership; never trust it directly from a client payload.
- Check both organization membership and role for every clinical read or mutation.
- Keep service-role keys and messaging credentials server-only.
- Use signed, short-lived URLs for private files.
- Record access and mutations involving clinical records in an immutable audit trail.
- Collect versioned consent before accepting clinical information.
- Support patient data export and deletion requests with an auditable process.
- Back up the database daily and test restoration regularly.

## Public endpoints

Booking, intake, and authentication endpoints require schema validation, rate limiting, non-enumerating error messages, expiry for public tokens, and transactional conflict protection.

Messaging webhooks must verify the provider signature before reading or changing data. Outbound messaging endpoints require an authenticated role or a scheduler-held secret and must be idempotent.

## Logging

Never log:

- Clinical notes, diagnoses, laboratory values, meal plans, or intake answers.
- Authentication tokens, cookies, one-time codes, or credentials.
- Full phone numbers, email addresses, or names when an internal identifier is sufficient.

## Development data

Use synthetic fixtures only. Production data must never be copied to local development, screenshots, tests, issue trackers, or AI prompts.

## Security review gates

Before the pilot, verify RLS with cross-organization tests, role restrictions, signed storage access, webhook verification, rate limits, audit coverage, backup restoration, dependency scanning, and secret scanning.
