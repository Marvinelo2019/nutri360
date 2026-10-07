-- Organization-local appointment month reporting for staff dashboards and exports.

create function public.list_appointments_for_local_month(
  target_organization_id uuid,
  target_month date
)
returns setof public.appointments
language sql
security definer
set search_path = ''
stable
as $$
  select appointment.*
  from public.appointments as appointment
  join public.organizations as organization
    on organization.id = appointment.organization_id
  where appointment.organization_id = target_organization_id
    and (select private.has_organization_role(
      target_organization_id,
      array['owner','nutritionist','assistant']::public.app_role[]
    ))
    and appointment.starts_at
      >= date_trunc('month', target_month::timestamp)
        at time zone organization.timezone
    and appointment.starts_at
      < (date_trunc('month', target_month::timestamp) + interval '1 month')
        at time zone organization.timezone
  order by appointment.starts_at, appointment.id;
$$;

revoke all on function public.list_appointments_for_local_month(uuid,date) from public;
grant execute on function public.list_appointments_for_local_month(uuid,date)
  to authenticated;
