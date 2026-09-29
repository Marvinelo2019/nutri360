# Supabase

All database changes must be represented by ordered SQL migrations in `migrations/`. Do not make unrecorded production-only schema changes.

Each migration that adds an organization-owned table must also add indexes, Row Level Security, explicit policies, timestamps, and relevant audit coverage. Migrations must be tested against a fresh local database and an upgrade path before deployment.
