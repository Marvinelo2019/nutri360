# Application-specific instructions

- Use strict TypeScript. Do not introduce JavaScript source files.
- Prefer React Server Components; add `"use client"` only at the narrowest interactive boundary.
- Validate external input with Zod at the server boundary.
- Keep Supabase browser, server-session, and privileged clients separate.
- Never perform privileged clinical mutations directly from a browser component.
- Every organization-owned query must be protected by RLS and scoped by the authenticated membership.
- Use Spanish for user-facing content and `America/Guatemala`/GTQ defaults through centralized formatting helpers.
- Store monetary values as integer minor units and measurements with explicit units.
- Represent package usage with an immutable ledger rather than incrementing a counter without history.
- Add tests for nutrition formulas, authorization rules, date/time behavior, and financial calculations.
- Keep components accessible by keyboard, with visible focus, semantic labels, and usable mobile layouts.
