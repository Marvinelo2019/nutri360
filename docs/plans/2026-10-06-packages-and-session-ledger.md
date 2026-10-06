# Packages and session ledger

Status: complete.

## Outcome

Clinic staff can define reusable consultation packages, sell a package to a patient, see its reliable remaining-session balance, consume one session against a completed appointment, and reverse an accidental consumption without rewriting history.

## Scope

Included:

- Organization-owned package definitions with name, session count, price, validity period, and active state.
- Patient package purchases that snapshot the commercial terms at sale time.
- Optional paid or pending payment creation in the same transaction as the sale.
- Appointment-linked immutable usage and reversal entries with balances derived from the ledger.
- Package directory, creation, sale, patient-package detail, consumption, reversal, and empty/error/loading states.
- Owner, nutritionist, and assistant access, tenant isolation, audit events, validation, and pgTAP coverage.

Excluded:

- Online payment collection, invoices, subscriptions, promotional discounts, partial package refunds, package transfers, and automatic consumption before an appointment is completed.
- Changes to the pending Twilio Sandbox integration.

## Context

- Product and acceptance requirements: `docs/PRODUCT.md`, `docs/SECURITY.md`, and `docs/ROADMAP.md`.
- Conceptual entities already exist in `docs/DATA_MODEL.md` but have not been implemented.
- Existing `patients`, `appointments`, and `payments` tables provide the ownership and operational relationships.
- Payments store integer centavos and organization-local effective dates.
- The worktree contains a separate uncommitted Twilio Sandbox increment; package files and migrations must remain independently reviewable.

## Data changes

- Add package definition, patient purchase, and immutable usage-ledger tables with composite organization foreign keys.
- Extend payments with an optional patient-package relationship while preserving existing appointment payments.
- Add narrowly scoped security-definer RPCs for definition creation/update, package sale, session consumption, and consumption reversal.
- Derive remaining sessions from ledger sums; do not maintain a mutable consumed counter.
- Add RLS, grants, immutable identity/ledger guards, indexes, audit triggers, and cross-organization tests.

The migration is forward-only. Local rollback uses `supabase db reset`; shared environments require a later corrective migration.

## Implementation steps

1. Add schema, constraints, RLS, audit triggers, RPCs, and pgTAP tests.
2. Refresh generated database types and add Zod/server-action boundaries.
3. Build package catalog and patient sale flows.
4. Build patient-package detail with balance, eligible completed appointments, consumption, and reversal history.
5. Link packages from payments and patient records, then update product status and data-model documentation.
6. Run formatting, lint, strict TypeScript, application tests, production build, database tests/lint, and a focused browser flow.

## Security and privacy

- Organization ownership is derived from authenticated memberships and verified again in PostgreSQL.
- Cross-organization patient, appointment, package, and payment identifiers are rejected transactionally.
- Administrative roles may operate packages without access to clinical notes or meal-plan data.
- Usage rows are append-only; reversals reference an earlier consumption and cannot themselves be reversed twice.
- A completed appointment can consume at most one package session, preventing duplicate charges under retries or double clicks.
- Audit metadata contains identifiers, counts, amounts, and states only—no clinical text.

## Verification

- Cross-organization users cannot read or mutate definitions, purchases, or usages.
- Selling a package snapshots name, sessions, price, and validity independently of later definition edits.
- Paid and pending sales create correctly linked payments in integer centavos.
- Only completed appointments for the same patient and organization can consume a session.
- Concurrent or repeated consumption of one appointment cannot create a duplicate debit.
- Exhausted, expired, cancelled, or inactive patient packages reject consumption.
- Reversal creates a compensating immutable entry and restores the derived balance once.
- Relevant loading, error, and empty states render on mobile-width layouts.
- All repository definition-of-done commands pass.

## Progress log

- 2026-10-06: Plan created; immutable ledger and completed-appointment linkage selected as the implementation boundary.
- 2026-10-06: Added package definitions, immutable purchase snapshots, optional linked payments, append-only consumption/reversal entries, RLS, audited RPCs, and tenant-safe constraints.
- 2026-10-06: Added catalog, sale, detail, balance, consumption, reversal, cancellation, payment visibility, navigation, patient shortcut, and loading/error/empty states.
- 2026-10-06: All 395 database tests and database lint pass; focused package schema and presentation tests were added.
- 2026-10-06: Application lint, strict TypeScript, 66 tests, formatting, and production build pass. All three package routes return the expected protected redirect over local HTTP; authenticated browser validation remains pending because no browser surface was available.
- 2026-10-06: User completed authenticated browser validation by creating four package definitions and selling two packages with linked payments to synthetic patients; local database counts confirmed the result without reading patient data.

## Decision log

- 2026-10-06: Snapshot commercial terms on the patient package so later catalog edits cannot rewrite a historical sale.
- 2026-10-06: Derive balances from immutable ledger deltas rather than updating a consumed-session counter.
- 2026-10-06: Require an explicit consumption action after appointment completion; completing an appointment alone must not silently charge a package.
- 2026-10-06: Allow assistants to operate packages and payments because these records are administrative and contain no clinical narrative.
- 2026-10-06: Serialize consumption by appointment with a transaction advisory lock and reject only unreversed prior consumption, allowing a corrected package assignment after reversal.
