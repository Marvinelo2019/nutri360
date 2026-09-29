# Nutri360 repository instructions

## Product

Nutri360 is a Spanish-first, mobile-first practice management system for independent nutritionists and small clinics in Guatemala. The MVP must help a nutritionist prepare a branded meal plan in under 10 minutes, manage the clinical record, reduce missed appointments, and track payments.

The original physiotherapy application lives in `legacy-fisioterapia/` only as a visual and workflow reference. Never copy its credentials, patient data, schema assumptions, branding, or insecure data-access patterns into the new application.

## Sources of truth

Use these sources in order:

1. The user's current request.
2. `docs/PRODUCT.md` for approved scope and acceptance criteria.
3. `docs/SECURITY.md` for non-negotiable data protection rules.
4. `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md` for technical direction.
5. `docs/ROADMAP.md` and an active plan created from `PLANS.md` for sequencing.
6. The reference PDF at the repository root for product context.

If these conflict, stop and surface the conflict before changing product scope or weakening a security control.

## Working agreements

- Communicate with the user in Spanish. Keep code, database identifiers, and technical documentation in English unless a user-facing label is involved.
- Use `app/` as the production application and `supabase/` for versioned database migrations.
- Prefer small, reviewable changes. Do not perform unrelated cleanup.
- For work spanning multiple modules, schema changes, or more than one session, create and maintain an execution plan following `PLANS.md`.
- Never edit `legacy-fisioterapia/` unless the user explicitly requests it.
- Never commit secrets, real patient data, private medical information, production exports, or access tokens.
- Treat the system as handling sensitive health data even during MVP development.

## Definition of done

A change is complete only when relevant documentation and migrations are updated, validation and authorization exist at the server boundary, loading/error/empty states are covered, and these commands pass from `app/`:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Use official OpenAI documentation for questions about Codex or OpenAI products.
