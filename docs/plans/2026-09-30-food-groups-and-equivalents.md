# Food groups and configurable equivalents

Status: complete locally and validated by the user in the browser; explanatory copy was improved from the usability feedback.

## Outcome

Nutrition professionals can define organization-specific food groups with nutrient values per equivalent, associate equivalents with draft meal-plan items, and compare estimated plan totals with the plan targets.

## Scope

Included:

- Organization-owned food groups with name, description, portion guidance, kcal, protein, carbohydrate, fat, display order, and active state.
- Create and edit workflows for owners and nutritionists.
- Optional food-group and equivalent-count association on draft meal-plan items.
- Estimated plan energy and macro totals derived from configured equivalents.
- RLS, server-owned organization identity, audit events, validation, empty/error states, and database/application tests.

Excluded:

- A pre-populated or clinically validated food-composition dataset.
- Individual foods, recipes, micronutrients, automatic substitutions, and importing external tables.
- Editing items or group definitions as a way to alter already active/archived clinical plan versions.

## Context

- Existing draft/active/archived meal plans and free-text meal items.
- Existing immutable published-plan controls and clinician-only meal-plan access.
- Product requirements in `docs/PRODUCT.md`; security requirements in `docs/SECURITY.md`.
- Values entered by a clinic are organization-specific configuration and must not be labelled as validated reference data.

## Data changes

- Add `food_groups` with organization scoping, nutrient bounds, active state, RLS, identity guards, and audit triggers.
- Add nullable `food_group_id` and `equivalent_count` to meal-plan items with organization-safe foreign keys.
- Add clinician-only RPCs for creating/updating groups and assigning equivalence metadata to draft items.
- Existing meal items remain valid with no group association.
- Local rollback uses `supabase db reset`; shared environments use forward migrations.

## Implementation steps

1. Add schema, permissions, RPCs, and pgTAP coverage.
2. Add TypeScript database types, Zod schemas, server actions, and data access.
3. Build food-group directory and create/edit UI.
4. Connect optional equivalents to draft meal items and show estimated totals.
5. Update project status and run all verification gates.

## Security and privacy

- Only owners and nutritionists can read or mutate food groups and equivalent assignments.
- PostgreSQL derives organization identity from the authenticated membership and verifies plan/group ownership transactionally.
- Assistants and cross-organization users receive no rows and cannot call mutation RPCs.
- Audit metadata contains identifiers only, not clinical meal-plan content.
- Active and archived plan items remain immutable.

## Verification

- Groups cannot cross organization boundaries or reuse a name within one active catalog.
- Nutrient values and equivalent counts enforce explicit numeric bounds.
- Draft items accept an optional same-organization active group and equivalent count.
- Active plan items reject equivalence changes.
- Estimated totals equal the sum of equivalent count multiplied by group values.
- Application checks, database tests, format, build, and database lint pass.

## Progress log

- 2026-09-30: Plan created after the clinical-planning checkpoint.
- 2026-09-30: Added organization-scoped group definitions, nutrient bounds, clinician-only RLS, audited RPCs, and immutable item snapshots.
- 2026-09-30: Added the group directory and create/edit workflows with explicit organization-configured-data labelling.
- 2026-09-30: Connected optional equivalents to draft meal items and added estimated plan energy/macronutrient totals.
- 2026-09-30: Passed 211 database tests, application checks, database lint, formatting, and the production build.
- 2026-09-30: User confirmed group creation in the browser and reported that the concept was initially unclear; added a plain-language explanation and visible equivalent-field labels.

## Decision log

- 2026-09-30: Do not seed unverified nutrient values; clinics configure their catalog until a regional dataset is selected and validated.
- 2026-09-30: Preserve free-text food and portion fields so the new equivalent workflow remains optional and backward compatible.
