# Data model

## Conventions

Organization-owned tables include:

- `id uuid primary key`
- `organization_id uuid not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `deleted_at timestamptz null` when soft deletion is required

Store timestamps in UTC and render them using the organization's time zone. Store money in integer minor units, for example `amount_centavos`, rather than floating-point values. Clinical calculations retain their inputs, formula version, output, and unit.

## Core entities

### Identity and tenancy

- `organizations`: name, branding, contact details, timezone, subscription plan.
- `profiles`: authenticated user, organization, display name, role, status.
- `organization_memberships`: supports future users belonging to more than one organization.
- `audit_events`: actor, action, entity, entity ID, request metadata, timestamp.

### Patients and clinical record

- `patients`: general data, birth date, sex used for formulas when required, contact preferences, status, and consent timestamps.
- `patient_histories`: goals, diagnoses, allergies, medications, family history, and configurable structured history.
- `dietary_histories`: 24-hour recall, habits, water, sleep, activity, preferences, and restrictions.
- `intake_invites`: scoped token, expiration, completion state, and patient association.
- `consultations`: date, SOAP fields, clinical summary, responsible professional.
- `anthropometric_measurements`: weight, height, circumferences, skinfolds, body fat, calculated indicators, and units.
- `lab_results`: test, value, unit, reference bounds, collected date, and notes.
- `patient_progress_entries`: patient-entered weight and note.

### Nutrition planning

- `food_groups`: organization-configurable equivalent definitions.
- `foods`: local or organization-defined food, portion, nutrients, source, and version.
- `energy_calculations`: formula, inputs, activity factor, goal adjustment, and result.
- `meal_plans`: patient, targets, status, version, validity, and generated PDF object path.
- `meal_plan_meals`: meal time, ordering, and option number.
- `meal_plan_items`: meal option, food, quantity, unit, and calculated nutrients.
- `meal_plan_templates`: reusable organization-owned plan structure.

### Operations

- `appointments`: patient, professional, start/end timestamps, modality, status, and meeting link.
- `availability_rules` and `availability_blocks`: recurring schedules and exceptions.
- `reminders`: appointment, channel, scheduled time, state, attempt count, and provider ID.
- `packages`: reusable package definition.
- `patient_packages`: purchase, session totals, consumed sessions, expiration, and state.
- `package_usages`: appointment-linked immutable consumption or reversal ledger.
- `payments`: patient, appointment/package, amount in minor units, method, status, and paid timestamp.

## Initial enums

- Roles: `owner`, `nutritionist`, `assistant`, `patient`.
- Appointment status: `pending`, `confirmed`, `completed`, `no_show`, `cancelled`, `rescheduled`.
- Payment status: `pending`, `paid`, `voided`, `refunded`.
- Meal-plan status: `draft`, `active`, `archived`.

The SQL migrations are authoritative once implementation begins; this document must be updated when the conceptual model changes.
