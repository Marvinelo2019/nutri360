# Reusable meal-plan templates

Status: complete and browser-validated.

## Outcome

Nutrition professionals can save a completed meal-plan structure as an organization-owned template and create a new patient-specific draft from that snapshot without changing either the source plan or the template.

## Scope

Included:

- Save an existing plan with at least one item as a named, categorized template.
- Snapshot meals, suggested times, items, guidance, configured equivalents, daily targets, and general instructions.
- Browse template summaries and inspect their contents.
- Create a patient-specific draft from a template with a new plan name and optional validity dates.
- Archive templates without altering plans already created from them.
- Role checks, organization isolation, audit events, server validation, empty/error states, and tests.

Excluded:

- Shared templates across organizations, public marketplace templates, template import/export, collaborative editing, and automatic clinical recommendations.
- Individual-food database work, branded PDF generation, and changing an existing plan through later template edits.

## Context

- Existing meal plans have immutable active/archived versions and editable drafts.
- Plan items can contain optional immutable food-group/equivalent snapshots.
- Assistants cannot read or modify clinical meal-plan content.
- Requirements come from `docs/PRODUCT.md`, `docs/SECURITY.md`, and the phase-2 roadmap.

## Data changes

- Add `meal_plan_templates`, `meal_plan_template_meals`, and `meal_plan_template_items` with organization ownership and snapshot fields.
- Add clinician-only RLS and audited security-definer RPCs to save a source plan, instantiate a draft, and archive a template.
- Preserve source-plan provenance by identifier only; never copy patient identity into templates.
- Local rollback uses `supabase db reset`; shared environments use forward migrations.

## Implementation steps

1. Add template schema, RLS, audited transactional RPCs, and pgTAP coverage.
2. Add TypeScript database boundaries, Zod schemas, actions, and reads.
3. Add template directory, detail, save-from-plan, and use-template interfaces.
4. Update documentation and run all verification gates.

## Security and privacy

- Only active owners and nutritionists can read or mutate template content.
- PostgreSQL derives template organization from the authenticated source plan or membership and validates the target patient transactionally.
- Template snapshots never contain patient identifiers, dates, clinical notes, or source patient names.
- Assistants, patients, and cross-organization users receive no template rows and cannot execute template RPCs.
- Audit metadata contains template/source identifiers only, not meal content.

## Verification

- Saving a source plan copies all active items and equivalent snapshots but no patient identity.
- Instantiation creates an independent draft for a same-organization active patient.
- Later plan/template changes cannot mutate one another.
- Empty plans cannot become templates and archived templates cannot be instantiated.
- Cross-organization access and assistant access are rejected.
- Application tests, database tests/lint, formatting, type checking, and production build pass.

## Progress log

- 2026-09-30: Plan created after the public-booking checkpoint.
- 2026-09-30: Added clinician-only template snapshots, independent draft creation, archiving, audit events, RLS, and cross-organization pgTAP coverage.
- 2026-09-30: Added save, directory, detail, and use-template interfaces. Application lint, typecheck, formatting, production build, and 52 tests pass; database lint and 278 tests pass.
- 2026-09-30: User validated saving a plan as a template and creating a reusable patient-specific draft in the browser.

## Decision log

- 2026-09-30: Templates are immutable content snapshots; archiving replaces destructive deletion for the MVP.
- 2026-09-30: Template creation starts from a plan already reviewed by a nutrition professional rather than from an empty parallel editor.
