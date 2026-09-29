# Nutri360 product definition

## Vision

Nutri360 helps an independent nutritionist or a small clinic in Guatemala manage the complete patient journey: intake, consultation, anthropometry, meal planning, appointments, follow-up, and payments.

The central product promise is that a nutritionist can prepare a complete, branded meal plan in less than 10 minutes without maintaining disconnected spreadsheets, documents, and chat threads.

## MVP users

- **Owner nutritionist:** manages clinical records, plans, appointments, payments, branding, and staff.
- **Assistant:** manages appointments, patient registration, payments, and reminders without access to clinical notes, laboratory results, or meal plans.
- **Patient:** views their own current plan, progress, and appointments; records weight; and books appointments.

## MVP modules

### 1. Patients and intake

- Register general information, goal, reason for consultation, history, allergies, and medications.
- Send a pre-consultation form by link.
- Record a 24-hour recall, habits, water, sleep, and physical activity.
- Search by name or phone and display the latest consultation.

### 2. Consultation and anthropometry

- Record weight, height, waist, hip, circumferences, skinfolds, and body-fat percentage.
- Calculate BMI, waist-to-hip ratio, and supported body-composition indicators.
- Record basic laboratory results with units and reference ranges.
- Record SOAP notes and compare with the previous consultation.
- Display progress charts from the second consultation onward.

### 3. Nutrition calculator and meal plans

- Calculate energy requirements using Mifflin-St Jeor, Harris-Benedict, or FAO/WHO.
- Configure activity and goal adjustments.
- Distribute macronutrients by percentage or grams per kilogram.
- Convert targets into configurable food-group equivalents.
- Build meal options using a validated local food database.
- Save and reuse templates.
- Generate a two-page, mobile-readable PDF with clinic branding.

### 4. Appointments and reminders

- Configure availability, appointment duration, and blocked periods.
- Publish a booking link.
- Send confirmation and reminders 24 hours and 2 hours before an appointment.
- Confirm, reschedule, cancel, attend, or mark a no-show.
- Synchronize with Google Calendar.

### 5. Patient portal

- Passwordless access using phone verification or a one-time code.
- View the current plan, instructions, and shopping list.
- Record weekly weight and see progress.
- View and book the next appointment.
- Be installable as a PWA and load in under three seconds on a typical 4G connection.

### 6. Billing and dashboard

- Register consultation payments and pending balances.
- Sell packages and consume sessions reliably.
- Show today's appointments, active patients, monthly no-shows, and monthly revenue.
- Export the monthly report to Excel.

## MVP exclusions

- Native iOS or Android applications.
- Integrated video calls.
- Electronic invoicing (FEL) and online payments.
- Direct bioimpedance-scale integrations.
- AI-generated meal plans.
- Extensive recipe management or food-photo diaries.
- Multi-location enterprise reporting.

## Regional defaults

- Language: Spanish.
- Time zone: `America/Guatemala`.
- Currency: GTQ.
- Phone numbers: stored in E.164 format; the UI may apply Guatemala-friendly formatting.
