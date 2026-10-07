# Monthly operations report and Excel export

Status: complete.

## Outcome

Authorized clinic staff can select a Guatemala-local month, review operational and financial totals, and download a styled Excel workbook that reconciles the same appointments, payments, package sales, and session usage shown in Nutri360.

## Scope

Included:

- Month selector and organization-scoped report screen.
- Appointment totals by operational status and no-show rate.
- Paid revenue and pending balance using effective payment dates.
- Package sales, sessions sold, and sessions consumed in the selected month.
- `.xlsx` download with `Resumen`, `Citas`, `Pagos`, and `Paquetes` worksheets.
- Owner, nutritionist, and assistant access with RLS/RPC authorization, audit-safe fields, loading/error/empty states, and mobile layouts.
- Formula/unit tests, pgTAP coverage, workbook structure checks, and visual workbook verification.

Excluded:

- Clinical notes, diagnoses, laboratory data, meal plans, patient phone/email, tax invoices, accounting-system integration, scheduled email delivery, and multi-organization consolidation.
- Google Calendar and Twilio changes.

## Context

- Product requirements: `docs/PRODUCT.md`, `docs/SECURITY.md`, and phase 3 of `docs/ROADMAP.md`.
- Existing appointment, payment, package, and immutable session-ledger data are authoritative.
- Payments already expose an organization-local effective-month RPC.
- Appointment month boundaries must use the organization timezone, not the server timezone.
- Excel generation runs only on the authenticated server boundary and must not expose data from another organization.

## Data changes

- Add a staff-authorized `list_appointments_for_local_month` RPC using organization timezone boundaries.
- No reporting snapshots or duplicated totals are stored; the report derives values from current operational records.
- No patient contact or clinical fields are selected for report generation.

The migration is forward-only. Local rollback uses `supabase db reset`; shared environments require a later corrective migration.

## Implementation steps

1. Add the month-scoped appointment RPC and pgTAP tests for timezone and tenant isolation.
2. Add report schemas, pure summary calculations, server data composition, and unit tests.
3. Build the month selector, report page, loading/error/empty states, and navigation.
4. Add a protected Node.js route that generates the four-sheet Excel workbook.
5. Verify workbook labels, values, formulas, styles, formulas/errors, and rendered worksheets using the spreadsheet workflow.
6. Update documentation and run application/database definition-of-done commands plus a focused authenticated browser flow.

## Security and privacy

- Every query is scoped to the authenticated organization and authorized again in PostgreSQL where an RPC is used.
- Reports contain administrative data only: patient display name is included for reconciliation, while contact and clinical data are excluded.
- The export route is dynamic, authenticated, role-checked, non-cacheable, and returns the workbook directly without writing it to public storage.
- Filenames contain the organization slug and selected month, not patient names.
- Logs and errors must not include workbook contents or patient names.

## Verification

- Cross-organization users receive no report rows.
- Guatemala-local month cutoffs include boundary appointments correctly.
- No-show rate uses `no_show / (completed + no_show)` and is unavailable when no resolved appointments exist.
- Paid revenue excludes pending, voided, and refunded payments; pending balance includes only pending payments.
- Package sales and consumed sessions reconcile with purchase and immutable ledger records for the selected month.
- Workbook totals match the UI summary and supporting sheets.
- Dates, counts, percentages, and GTQ amounts are typed and formatted correctly in Excel.
- Workbook contains no phone, email, or clinical columns and no formula errors.
- All repository definition-of-done commands pass.

## Progress log

- 2026-10-06: Plan created; four-sheet administrative workbook and resolved-appointment no-show denominator selected.
- 2026-10-06: Added the organization-local appointment RPC with tenant, role, and Guatemala month-boundary coverage.
- 2026-10-06: Added the monthly report UI, loading/error/empty states, navigation entry, protected non-cacheable export route, and Excel generator.
- 2026-10-06: Rejected ExcelJS because its production dependency tree introduced known vulnerabilities; selected the smaller audited `fflate` runtime and generated constrained OOXML directly.
- 2026-10-06: Verified the generated workbook imports with four worksheets, ten summary formulas, no formula errors, and legible renders for every worksheet.
- 2026-10-06: Passed 404 database tests, 74 application tests, lint, typecheck, and the production build. Automated browser control was unavailable; the authenticated report flow remains for the user to validate locally.
- 2026-10-06: User validated the authenticated report screen and successfully downloaded and reviewed the Excel workbook.

## Decision log

- 2026-10-06: Treat completed and no-show appointments as the resolved denominator; pending, confirmed, cancelled, and rescheduled appointments do not distort the no-show rate.
- 2026-10-06: Generate exports on demand at the authenticated server boundary rather than storing potentially sensitive workbooks.
- 2026-10-06: Keep one `Paquetes` sheet containing purchases plus selected-month consumption/current balance so the workbook remains compact and reconciliable.
- 2026-10-06: Use inline-string cells for names and labels so text beginning with `=` cannot become an executable spreadsheet formula.
