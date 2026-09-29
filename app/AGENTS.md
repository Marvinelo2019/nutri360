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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
