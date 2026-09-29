# Architecture

## Decision

The MVP uses a modular monolith rather than separate frontend and backend deployments:

- Next.js App Router and TypeScript for the web application, public booking, patient portal, and server endpoints.
- Supabase Postgres for relational data, Row Level Security, authentication, and private object storage.
- Server-only jobs for reminders, PDF generation, calendar synchronization, and retries.
- Vercel-compatible deployment initially; infrastructure can be revisited after pilot usage justifies it.

This keeps the system small enough for one developer while preserving clear domain boundaries.

## Application boundaries

Organize production code by domain rather than by screen:

```text
app/src/
  app/                 # routes and layouts
  components/          # reusable presentation components
  features/
    appointments/
    billing/
    consultations/
    meal-plans/
    organizations/
    patients/
    portal/
  lib/
    auth/
    db/
    nutrition/
    supabase/
    validation/
```

React Server Components are the default. Client Components are used only for browser interaction. Mutations pass through authenticated server actions or route handlers; privileged database access never runs in the browser.

## Data access

- Browser clients use the public Supabase key and are restricted by RLS.
- Server clients carry the current authenticated session.
- Administrative/service credentials are allowed only inside server-only jobs and narrowly scoped endpoints.
- Every organization-owned row includes `organization_id`.
- Public booking exposes purpose-built availability and booking operations, not general table access.

## Background work

Appointments create reminder jobs with explicit `scheduled_at` timestamps. A scheduler claims due jobs, sends them through an approved provider, records provider identifiers, and retries transient failures idempotently.

PDF generation, calendar synchronization, and outbound messaging must not block clinical form submissions.

## Observability

- Structured logs without clinical content or full phone numbers.
- Error monitoring with organization and request identifiers, never sensitive form payloads.
- Audit events for reading and changing clinical records.
- Delivery metrics for reminders and generated plans.
