# Execution plans

Use an execution plan for schema migrations, cross-module features, security work, or tasks expected to take more than one focused implementation session.

Store active plans under `docs/plans/` using `YYYY-MM-DD-short-name.md`. A plan is a living document and must be updated as implementation changes.

Each plan must contain:

1. **Outcome** - the user-visible result.
2. **Scope** - included work and explicit exclusions.
3. **Context** - relevant files, modules, constraints, and prior decisions.
4. **Data changes** - migrations, backfills, RLS policies, and rollback approach.
5. **Implementation steps** - independently verifiable milestones.
6. **Security and privacy** - authorization, auditability, sensitive fields, and abuse cases.
7. **Verification** - tests, manual checks, performance checks, and acceptance criteria.
8. **Progress log** - dated completed work, discoveries, and deviations.
9. **Decision log** - important tradeoffs with rationale.

Plans must be concrete enough that another engineer or Codex session can continue without relying on chat history.
