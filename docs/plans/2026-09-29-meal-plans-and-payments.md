# Meal plans and payments

Status: complete.

## Outcome

Nutrition professionals can create and activate a structured daily meal plan for a patient, while authorized clinic staff can register and track patient payments with accurate monthly totals.

## Scope

Included:

- Meal-plan header with patient, name, validity, energy/macronutrient targets, and instructions.
- Five default meal sections with reusable item entry for food, portion, unit, and optional guidance.
- Draft, active, and archived plan lifecycle; at most one active plan per patient.
- Payment entry with patient, amount in centavos, method, status, and payment date.
- Pending, paid, voided, and refunded payment lifecycle.
- Plan and payment directories, detail/builder screens, empty/error states, and dashboard totals.
- RLS, role-specific RPCs, audit events, validation, and cross-organization tests.

Excluded:

- Validated food composition database, automatic energy formulas, equivalents, reusable templates, PDF generation, and patient delivery.
- Packages, session-consumption ledger, online collection, invoices, partial refunds, and Excel export.

## Context

- Product requirements: `docs/PRODUCT.md`.
- Security requirements: `docs/SECURITY.md`.
- Existing patients, appointments, tenancy helpers, and application shell.
- All amounts are stored in integer centavos; clinical plan content is unavailable to assistants.

## Data changes

Two forward migrations add normalized meal-plan tables and payment records, their enums, indexes, foreign keys, RLS, immutable identity guards, audit triggers, and narrowly scoped server-owned RPCs.

Migrations are applied incrementally to the local stack to preserve current development data. Local full rollback remains `supabase db reset`; shared environments use later forward migrations.

## Implementation steps

1. Add meal-plan schema, permissions, RPCs, and pgTAP coverage.
2. Add payment schema, permissions, RPCs, and pgTAP coverage.
3. Add typed boundaries, Zod schemas, date/money helpers, and unit tests.
4. Build plan list, creation, detail builder, item removal, and activation.
5. Build payment list, monthly summary, registration, and status actions.
6. Enable navigation and dashboard totals; run all validation and production build.

## Security and privacy

- Meal plans are clinical data: only owners and nutritionists can read or mutate them.
- Assistants can operate payment records but never obtain meal-plan content.
- Organization and patient ownership are derived and checked in PostgreSQL.
- Clinical reads and all mutations create immutable audit events.
- Amounts are integer centavos and totals include only paid, non-refunded records.
- Browser payloads never determine organization ownership or calculated totals.

## Verification

- Cross-organization users see no plan or payment rows.
- Assistants see payments but zero meal-plan clinical rows.
- Activating a plan archives the prior active plan for that patient.
- Meal items remain organization- and plan-scoped.
- Payment transitions reject invalid or terminal changes.
- Monthly paid totals exclude pending, voided, and refunded records.
- Application checks, database tests, formatting, build, and protected-route checks pass.

## Progress log

- 2026-09-29: Plan created for the two explicitly authorized modules.
- 2026-09-29: Added structured plan creation, five-meal builder, item management, activation/version locking, and clinical access controls.
- 2026-09-29: Added payment entry, monthly reporting, status lifecycle, centavo-safe totals, and dashboard integration.
- 2026-09-29: Applied all migrations incrementally without resetting local development data.
- 2026-09-29: Passed 104 database tests, 25 application tests, lint, typecheck, formatting, production build, and protected-route HTTP checks.

## Decision log

- 2026-09-29: Use free-text foods and portions for the first builder; nutrient automation waits for a validated food database.
- 2026-09-29: Create five conventional meal sections automatically to keep first-plan creation fast.
- 2026-09-29: Keep payments administrative and free of clinical notes.
- 2026-09-29: Active plans are immutable clinical versions; modifications require a new draft.
- 2026-09-29: Monthly payment reporting uses each clinic's timezone and the effective paid date.
