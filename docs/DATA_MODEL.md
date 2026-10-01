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

- `organizations`: name, private logo path, brand color, contact details, timezone, and subscription plan.
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

- `food_groups`: organization-configurable equivalent definitions with portion guidance, energy/macronutrients per equivalent, ordering, and active state.
- `foods`: local or organization-defined food, portion, nutrients, source, and version.
- `energy_calculations`: immutable adult calculation snapshot with source measurement, reference sex and age, versioned Mifflin-St Jeor / revised Harris-Benedict / FAO-WHO-UNU formula, activity factor, explicit goal adjustment, resting/total/target energy, macro method inputs, and gram outputs.
- `meal_plans`: patient, targets, status, version, validity, and latest private PDF object path with generation actor/time.
- `meal_plan_meals`: meal time, ordering, and option number.
- `meal_plan_items`: meal option, food, quantity, unit, and optional immutable food-group/equivalent nutrient snapshot.
- `meal_plan_templates`: reusable organization-owned snapshot of plan targets and general instructions, with source-plan provenance but no patient identity.
- `meal_plan_template_meals` and `meal_plan_template_items`: independent meal, food, guidance, and equivalent snapshots used to create new patient-specific drafts.

### Operations

- `appointments`: patient, professional, start/end timestamps, modality, status, and meeting link.
- `public_booking_settings`: organization-level enabled state, slot duration, notice, horizon, modality, public instructions, and privacy-consent version.
- `availability_rules` and `availability_blocks`: professional recurring schedules and timezone-aware exceptions.
- `public_booking_rate_limits`: short-lived HMAC request counters without raw network identifiers.
- Public appointments snapshot their booking source and privacy-consent version; anonymously created administrative patients and appointments have no authenticated `created_by` actor.
- `reminder_settings`: organization channel preference and enablement for confirmation, 24-hour, and 2-hour notices.
- `appointment_reminders`: provider-neutral appointment jobs with explicit schedule, bounded attempts, lease state, idempotency key, normalized error, and provider message ID; patient contact data and rendered messages are not copied into the queue.
- `reminder_delivery_attempts`: immutable outcome ledger for each provider delivery attempt.
- `packages`: reusable package definition.
- `patient_packages`: purchase, session totals, consumed sessions, expiration, and state.
- `package_usages`: appointment-linked immutable consumption or reversal ledger.
- `payments`: patient, appointment/package, amount in minor units, method, status, and paid timestamp.

### Private object storage

- `organization-assets`: private clinic logos scoped by organization folder; owners write and clinicians read for document generation.
- `meal-plan-pdfs`: private generated plan documents scoped by organization and available only to clinical roles through authenticated downloads.

## Initial enums

- Roles: `owner`, `nutritionist`, `assistant`, `patient`.
- Appointment status: `pending`, `confirmed`, `completed`, `no_show`, `cancelled`, `rescheduled`.
- Payment status: `pending`, `paid`, `voided`, `refunded`.
- Meal-plan status: `draft`, `active`, `archived`.

The SQL migrations are authoritative once implementation begins; this document must be updated when the conceptual model changes.
