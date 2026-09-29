-- Internal appointment scheduling with timezone-aware daily views.

create extension if not exists btree_gist with schema extensions;

create type public.appointment_status as enum (
  'pending', 'confirmed', 'completed', 'no_show', 'cancelled', 'rescheduled'
);
create type public.appointment_modality as enum ('in_person', 'video', 'phone');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null,
  professional_user_id uuid not null references auth.users (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  modality public.appointment_modality not null default 'in_person',
  status public.appointment_status not null default 'confirmed',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '4 hours'),
  foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict
);

create index appointments_org_start_idx
  on public.appointments (organization_id, starts_at, status);
create index appointments_patient_start_idx
  on public.appointments (patient_id, starts_at desc);
alter table public.appointments add constraint appointments_professional_no_overlap
  exclude using gist (
    professional_user_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'rescheduled'));

create function private.prevent_appointment_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.organization_id <> old.organization_id
    or new.patient_id <> old.patient_id
    or new.professional_user_id <> old.professional_user_id
    or new.starts_at <> old.starts_at
    or new.ends_at <> old.ends_at
    or new.created_by <> old.created_by then
    raise exception 'Appointment identity and schedule cannot be changed';
  end if;
  return new;
end;
$$;

create function private.audit_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    metadata
  ) values (
    new.organization_id, (select auth.uid()), lower(tg_op),
    'appointments', new.id,
    jsonb_build_object('status', new.status, 'modality', new.modality)
  );
  return new;
end;
$$;

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute procedure private.set_updated_at();
create trigger appointments_identity_guard
  before update on public.appointments
  for each row execute procedure private.prevent_appointment_identity_change();
create trigger appointments_audit
  after insert or update on public.appointments
  for each row execute procedure private.audit_appointment_change();

alter table public.appointments enable row level security;
revoke all on table public.appointments from anon, authenticated;
grant select on table public.appointments to authenticated;

create policy appointments_select_staff
  on public.appointments for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )));

create function public.create_appointment(
  target_patient_id uuid,
  target_professional_user_id uuid,
  local_start timestamp without time zone,
  duration_minutes integer,
  appointment_modality public.appointment_modality
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_row public.patients;
  organization_timezone text;
  calculated_start timestamptz;
  created_appointment_id uuid;
begin
  select * into patient_row from public.patients
  where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )) then raise exception 'Appointment role required'; end if;
  if duration_minutes not between 30 and 240 then
    raise exception 'Duration must be between 30 and 240 minutes';
  end if;
  if not exists (
    select 1 from public.organization_memberships
    where organization_id = patient_row.organization_id
      and user_id = target_professional_user_id
      and status = 'active'
      and role in ('owner', 'nutritionist')
  ) then raise exception 'Professional is not active in organization'; end if;

  select timezone into organization_timezone
  from public.organizations where id = patient_row.organization_id and deleted_at is null;
  calculated_start := local_start at time zone organization_timezone;
  if calculated_start < now() - interval '5 minutes' then
    raise exception 'Appointment cannot start in the past';
  end if;

  insert into public.appointments (
    organization_id, patient_id, professional_user_id, starts_at, ends_at,
    modality, status, created_by
  ) values (
    patient_row.organization_id, patient_row.id, target_professional_user_id,
    calculated_start, calculated_start + make_interval(mins => duration_minutes),
    appointment_modality, 'confirmed', (select auth.uid())
  ) returning id into created_appointment_id;

  return created_appointment_id;
exception
  when exclusion_violation then
    raise exception 'Professional already has an appointment in that time range';
end;
$$;

create function public.change_appointment_status(
  target_appointment_id uuid,
  next_status public.appointment_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments;
begin
  select * into appointment_row from public.appointments where id = target_appointment_id;
  if appointment_row.id is null then raise exception 'Appointment not found'; end if;
  if not (select private.has_organization_role(
    appointment_row.organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )) then raise exception 'Appointment role required'; end if;
  if appointment_row.status in ('completed', 'no_show', 'cancelled', 'rescheduled') then
    raise exception 'Final appointment status cannot be changed';
  end if;
  if next_status not in ('confirmed', 'completed', 'no_show', 'cancelled', 'rescheduled') then
    raise exception 'Unsupported appointment status transition';
  end if;

  update public.appointments set status = next_status where id = target_appointment_id;
end;
$$;

create function public.list_appointments_for_local_date(
  target_organization_id uuid,
  target_date date
)
returns setof public.appointments
language sql
security definer
set search_path = ''
stable
as $$
  select appointment.*
  from public.appointments as appointment
  join public.organizations as organization on organization.id = appointment.organization_id
  where appointment.organization_id = target_organization_id
    and (select private.has_organization_role(
      target_organization_id,
      array['owner', 'nutritionist', 'assistant']::public.app_role[]
    ))
    and appointment.starts_at >= target_date::timestamp at time zone organization.timezone
    and appointment.starts_at < (target_date + 1)::timestamp at time zone organization.timezone
  order by appointment.starts_at;
$$;

create function public.list_scheduling_professionals(target_organization_id uuid)
returns table (user_id uuid, full_name text, role public.app_role)
language sql
security definer
set search_path = ''
stable
as $$
  select membership.user_id, profile.full_name, membership.role
  from public.organization_memberships as membership
  join public.profiles as profile on profile.user_id = membership.user_id
  where membership.organization_id = target_organization_id
    and membership.status = 'active'
    and membership.role in ('owner', 'nutritionist')
    and (select private.has_organization_role(
      target_organization_id,
      array['owner', 'nutritionist', 'assistant']::public.app_role[]
    ))
  order by profile.full_name;
$$;

revoke all on function public.create_appointment(uuid, uuid, timestamp without time zone, integer, public.appointment_modality) from public;
revoke all on function public.change_appointment_status(uuid, public.appointment_status) from public;
revoke all on function public.list_appointments_for_local_date(uuid, date) from public;
revoke all on function public.list_scheduling_professionals(uuid) from public;
grant execute on function public.create_appointment(uuid, uuid, timestamp without time zone, integer, public.appointment_modality) to authenticated;
grant execute on function public.change_appointment_status(uuid, public.appointment_status) to authenticated;
grant execute on function public.list_appointments_for_local_date(uuid, date) to authenticated;
grant execute on function public.list_scheduling_professionals(uuid) to authenticated;
