-- Allow a reversed appointment consumption to be recorded against the correct package.

drop index public.package_usages_one_consumption_per_appointment_idx;

create or replace function public.consume_package_session(
  target_patient_package_id uuid,
  target_appointment_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_package_row public.patient_packages;
  appointment_row public.appointments;
  organization_timezone text;
  appointment_date date;
  remaining_sessions integer;
  created_usage_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_appointment_id::text, 0));
  select * into patient_package_row from public.patient_packages
  where id = target_patient_package_id for update;
  if patient_package_row.id is null then raise exception 'Patient package not found'; end if;
  if not (select private.has_organization_role(
    patient_package_row.organization_id,
    array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Package role required'; end if;
  if patient_package_row.status <> 'active' then raise exception 'Patient package is not active'; end if;
  select * into appointment_row from public.appointments
  where id = target_appointment_id
    and organization_id = patient_package_row.organization_id
    and patient_id = patient_package_row.patient_id;
  if appointment_row.id is null then raise exception 'Appointment not found'; end if;
  if appointment_row.status <> 'completed' then raise exception 'Appointment must be completed'; end if;
  if exists (
    select 1
    from public.package_usages as consumption
    where consumption.appointment_id = appointment_row.id
      and consumption.kind = 'consumption'
      and not exists (
        select 1 from public.package_usages as reversal
        where reversal.reverses_usage_id = consumption.id
      )
  ) then raise exception 'Appointment already consumed a package session'; end if;
  select timezone into organization_timezone from public.organizations
  where id = patient_package_row.organization_id;
  appointment_date := (appointment_row.starts_at at time zone organization_timezone)::date;
  if appointment_date < patient_package_row.purchased_on
    or appointment_date > patient_package_row.expires_on then
    raise exception 'Appointment is outside package validity';
  end if;
  select patient_package_row.total_sessions + coalesce(sum(session_delta), 0)
    into remaining_sessions
  from public.package_usages where patient_package_id = patient_package_row.id;
  if remaining_sessions <= 0 then raise exception 'Patient package has no remaining sessions'; end if;
  insert into public.package_usages (
    organization_id, patient_id, patient_package_id, appointment_id,
    kind, session_delta, recorded_by
  ) values (
    patient_package_row.organization_id, patient_package_row.patient_id,
    patient_package_row.id, appointment_row.id, 'consumption', -1, (select auth.uid())
  ) returning id into created_usage_id;
  return created_usage_id;
end;
$$;
