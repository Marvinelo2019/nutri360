# Authentication and application shell

Status: complete locally. Production email and deployment configuration remain separate operational steps.

## Outcome

A nutritionist can create an account, sign in, create their first clinic, and enter a protected Nutri360 dashboard with a sober clinical visual system that works on mobile and desktop.

## Scope

Included:

- Corporate design tokens and reusable form/button/surface primitives.
- Email and password registration, login, logout, and session feedback.
- First-clinic onboarding through the existing atomic database operation.
- Organization-aware server authorization and protected application shell.
- Initial dashboard empty state and navigation for the approved MVP modules.
- Accessible loading, validation, and error states.

Excluded:

- Password recovery and email-template customization.
- Staff invitations and organization switching.
- Patient, clinical, appointment, payment, and meal-plan persistence.
- Production Supabase credentials or deployment.

## Context

- Product scope: `docs/PRODUCT.md`.
- Security controls: `docs/SECURITY.md`.
- Architecture: `docs/ARCHITECTURE.md`.
- Foundation migration: `supabase/migrations/20260929190000_identity_and_tenancy.sql`.
- Next.js 16 uses `proxy.ts`; each Server Action still performs its own authentication and authorization check.
- Visual direction: restrained clinical greens, neutral surfaces, minimal line icons, modern controls, and no playful or decorative app styling.

## Data changes

No new migration is planned. Registration uses Supabase Auth, profile creation uses the existing auth trigger, and onboarding calls `public.create_organization` under the authenticated session.

Rollback removes the new routes and components; no shared database data transformation is involved.

## Implementation steps

1. Add typed database boundaries and centralized authenticated-session helpers.
2. Define the visual system and reusable brand, field, button, and icon components.
3. Implement registration and login with Zod-validated Server Actions and non-enumerating errors.
4. Implement authenticated organization onboarding and logout.
5. Build the protected responsive shell and initial dashboard.
6. Verify unit tests, authorization paths, responsive rendering, production build, and local end-to-end flow.

## Security and privacy

- Credentials are submitted only to Server Actions and Supabase Auth.
- Every action validates input and rechecks the authenticated identity.
- Protected pages resolve verified claims and an active membership on the server.
- User-facing authentication errors do not disclose whether an account exists.
- No tokens, cookies, email addresses, passwords, or names are logged.
- The service-role client is not used by authentication or onboarding UI.

## Verification

- Registration rejects weak or malformed input and creates the profile trigger result.
- Login accepts valid local credentials and returns a generic error for invalid credentials.
- An authenticated user without a membership reaches onboarding.
- Onboarding creates one organization and one active owner membership.
- Unauthenticated access to the panel redirects to login.
- The shell works at mobile and desktop widths with visible keyboard focus.
- `npm run check`, `npm run format:check`, `npm run build`, `npm run db:lint`, and `npm run db:test` pass.

## Progress log

- 2026-09-29: Plan created after approval of the corporate clinical direction and the authentication/application-shell milestone.
- 2026-09-29: Added typed Supabase access, Zod-validated login and registration actions, organization onboarding, verified-session data access, and logout.
- 2026-09-29: Added the responsive corporate shell, minimal line icon system, regional formatting, protected dashboard, and accessible empty/loading/error states.
- 2026-09-29: Verified public auth routes return HTTP 200 and unauthenticated dashboard access redirects to login; full automated verification passes locally.

## Decision log

- 2026-09-29: Keep route protection in the server data-access boundary; Proxy refreshes sessions but is not the authorization authority.
- 2026-09-29: Use email/password for the professional MVP flow; passwordless access remains reserved for the later patient portal.
- 2026-09-29: Establish a reusable restrained visual system before clinical screens so later modules remain consistent.
