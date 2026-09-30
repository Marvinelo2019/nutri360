drop function public.create_consultation(uuid,public.consultation_type,timestamptz);

create function public.create_consultation(
  target_patient_id uuid,
  requested_type public.consultation_type,
  consultation_time timestamp without time zone
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_row public.patients;
  organization_timezone text;
  calculated_time timestamptz;
  created_consultation_id uuid;
begin
  select * into patient_row from public.patients
  where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;

  select timezone into organization_timezone
  from public.organizations
  where id = patient_row.organization_id and deleted_at is null;
  calculated_time := consultation_time at time zone organization_timezone;
  if calculated_time > now() + interval '5 minutes' then
    raise exception 'Consultation time cannot be in the future';
  end if;

  insert into public.consultations (
    organization_id, patient_id, consultation_type, occurred_at, created_by
  ) values (
    patient_row.organization_id, patient_row.id, requested_type,
    calculated_time, (select auth.uid())
  ) returning id into created_consultation_id;
  return created_consultation_id;
end;
$$;

revoke all on function public.create_consultation(uuid,public.consultation_type,timestamp without time zone) from public;
grant execute on function public.create_consultation(uuid,public.consultation_type,timestamp without time zone) to authenticated;
