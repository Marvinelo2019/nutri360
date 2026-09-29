# Phase 0 - Identity and tenancy foundation

Status: complete locally. Linking to a hosted Supabase project remains a deployment step.

## Outcome

Nutri360 has a reproducible Supabase foundation where an authenticated professional can create an organization, users can only access organizations they belong to, roles are enforced in PostgreSQL, and identity changes are auditable.

## Scope

Included:

- Supabase local-project configuration and versioned migrations.
- Profiles, organizations, memberships, roles, and audit events.
- Organization bootstrap transaction.
- Row Level Security, explicit grants, authorization helpers, and critical indexes.
- Separate browser, authenticated-server, and service-role Supabase clients.
- Automated application checks and database security tests where the local runtime permits them.

Excluded:

- Patient and clinical tables.
- Authentication screens and invitation flows.
- Production Supabase project creation or credentials.
- Messaging, storage buckets, and billing.

## Context

- Product and role requirements: `docs/PRODUCT.md`.
- Security baseline: `docs/SECURITY.md`.
- Conceptual entities: `docs/DATA_MODEL.md`.
- Application package: `app/`.
- Database migrations: `supabase/migrations/`.

## Data changes

The first migration creates:

- `app_role` and `membership_status` enums.
- `profiles`, `organizations`, `organization_memberships`, and `audit_events`.
- Private authorization helpers that avoid recursive membership policies.
- RLS policies and explicit grants for `authenticated`; `anon` receives no table access.
- Updated-at, audit, immutable-membership identity, and last-owner protection triggers.
- An invoker-rights `create_organization` transaction for safe onboarding.

Rollback during local development is a database reset. After a shared environment exists, destructive rollback is replaced by a forward migration.

## Implementation steps

1. Initialize the Supabase project files and CLI workflow.
2. Add identity and tenancy migration with grants and RLS.
3. Add application environment validation and the three Supabase client boundaries.
4. Add database policy tests for owner, member, and non-member access.
5. Run formatting, application checks, migration reset/tests when Docker is available, and production build.
6. Link and push migrations only after a dedicated Nutri360 Supabase development project exists.

## Security and privacy

- No real user or patient data is used in fixtures.
- The browser never receives the service-role key.
- `organization_id` access is derived from memberships in RLS.
- Security-definer helpers live in `private`, pin an empty search path, and expose only boolean/set membership results.
- Audit records are append-only to application roles.
- Public/anonymous roles receive no access to foundation tables.

## Verification

- A user can create an organization and becomes its active owner atomically.
- Owners can update their organization and manage memberships.
- Non-owner members can read the organization and membership directory but cannot administer it.
- Users outside the organization receive zero rows and cannot mutate its records.
- The last active owner cannot be removed or demoted.
- `npm run check`, `npm run format:check`, and `npm run build` pass.
- `supabase db reset` and `supabase test db` pass when the local Docker runtime is available.

## Progress log

- 2026-09-29: Plan created after confirming PostgreSQL/Supabase as the database platform.
- 2026-09-29: Added the initial identity/tenancy migration with explicit grants, RLS, role helpers, audit triggers, organization bootstrap, and last-owner protection.
- 2026-09-29: Initialized the local Supabase CLI project and added separated browser, server-session, and privileged client factories with environment validation.
- 2026-09-29: Added pgTAP coverage for schema presence, RLS activation, organization bootstrap, role access, tenant isolation, and last-owner protection.
- 2026-09-29: Added the Next.js 16 session proxy using verified claims and completed a clean local database reset; all 20 pgTAP tests pass.
- 2026-09-29: Verified formatting, lint, strict TypeScript, three application tests, production build, database lint, all 20 database tests, and a live HTTP 200 response through the session proxy.

## Decision log

- 2026-09-29: Use a modular Next.js application with Supabase rather than a separate API service for the MVP.
- 2026-09-29: Use an invoker-rights database function for atomic organization bootstrap; privileged authorization helpers remain in the unexposed `private` schema.
- 2026-09-29: Keep profiles global to an authenticated identity and represent organization access exclusively through memberships.
