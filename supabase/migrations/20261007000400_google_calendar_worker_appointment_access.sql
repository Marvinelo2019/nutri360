-- The Calendar worker needs only appointment identity and timing. Keep patient
-- and clinical columns unavailable to the service role at the table boundary.
grant select (id, organization_id, starts_at, ends_at)
  on table public.appointments to service_role;
