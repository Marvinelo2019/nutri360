# MVP roadmap

## Phase 0 - Foundation

- Establish repository standards, automated checks, environments, and deployment preview.
- Define organizations, profiles, roles, migrations, and RLS.
- Implement authentication and an organization-aware application shell.
- Add audit infrastructure and synthetic development fixtures.

**Gate:** cross-organization access tests pass and no privileged key reaches the browser.

## Phase 1 - Clinical core

- Patients, search, consent, and pre-consultation intake.
- Dietary history, consultations, SOAP notes, anthropometry, and laboratory results.
- Fast adult weight-and-height assessment plus age-appropriate paediatric growth-reference calculations.
- Versioned clinical calculations and progress comparisons.

**Gate:** a nutritionist can complete an initial consultation and a follow-up using synthetic data.

## Phase 2 - Nutrition planning

- Food groups, validated local foods, equivalents, and organization-specific foods.
- Energy and macro calculator.
- Meal-plan builder, reusable templates, branding, and private PDF generation.

**Gate:** a plan can be produced from a template in less than 10 minutes and the PDF fits two mobile-readable pages.

## Phase 3 - Appointments and billing

- Availability, public booking, status lifecycle, reminders, and Google Calendar synchronization.
- Payments, packages, session-consumption ledger, dashboard, and Excel export.

**Gate:** reminder delivery and package balances are idempotent and reconcilable.

## Phase 4 - Patient portal and pilot

- Passwordless patient portal, active plan, shopping list, progress entries, and booking.
- PWA behavior, performance work, accessibility, operational alerts, and pilot feedback loop.

**Gate:** security review passes, backups are restorable, primary screens load within target, and two nutritionists complete full real-world rehearsals before onboarding pilot patients.
