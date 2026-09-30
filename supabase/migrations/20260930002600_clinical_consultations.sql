create type public.consultation_type as enum ('initial', 'follow_up');
create type public.consultation_status as enum ('draft', 'completed');

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete restrict,
  consultation_type public.consultation_type not null,
  status public.consultation_status not null default 'draft',
  occurred_at timestamptz not null default now(),
  subjective text check (subjective is null or char_length(subjective) <= 8000),
  objective text check (objective is null or char_length(objective) <= 8000),
  assessment text check (assessment is null or char_length(assessment) <= 8000),
  plan text check (plan is null or char_length(plan) <= 8000),
  clinical_summary text check (clinical_summary is null or char_length(clinical_summary) <= 4000),
  created_by uuid not null references auth.users (id) on delete restrict,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultations_completion_consistent check (
    (status = 'draft' and completed_at is null and completed_by is null)
    or (status = 'completed' and completed_at is not null and completed_by is not null)
  ),
  constraint consultations_patient_org_fkey foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict
);

create index consultations_patient_date_idx
  on public.consultations (patient_id, occurred_at desc);
create index consultations_org_date_idx
  on public.consultations (organization_id, occurred_at desc);

create function private.prevent_consultation_invalid_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id
    or new.organization_id <> old.organization_id
    or new.patient_id <> old.patient_id
    or new.created_by <> old.created_by
    or new.created_at <> old.created_at then
    raise exception 'Consultation identity cannot be changed';
  end if;
  if old.status = 'completed' then
    raise exception 'Completed consultations are immutable';
  end if;
  if old.status = 'draft' and new.status = 'completed' then
    if nullif(trim(new.assessment), '') is null or nullif(trim(new.plan), '') is null then
      raise exception 'Assessment and plan are required to complete a consultation';
    end if;
  elsif new.status <> old.status then
    raise exception 'Unsupported consultation status transition';
  end if;
  return new;
end;
$$;

create trigger consultations_set_updated_at
  before update on public.consultations
  for each row execute procedure private.set_updated_at();
create trigger consultations_change_guard
  before update on public.consultations
  for each row execute procedure private.prevent_consultation_invalid_change();
create trigger consultations_audit
  after insert or update on public.consultations
  for each row execute procedure private.audit_patient_child_change();

alter table public.consultations enable row level security;
revoke all on table public.consultations from anon, authenticated;
grant select on table public.consultations to authenticated;

create policy consultations_select_clinician
  on public.consultations for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )));

create function public.create_consultation(
  target_patient_id uuid,
  requested_type public.consultation_type,
  consultation_time timestamptz
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_row public.patients;
  created_consultation_id uuid;
begin
  select * into patient_row from public.patients
  where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  if consultation_time > now() + interval '5 minutes' then
    raise exception 'Consultation time cannot be in the future';
  end if;

  insert into public.consultations (
    organization_id, patient_id, consultation_type, occurred_at, created_by
  ) values (
    patient_row.organization_id, patient_row.id, requested_type,
    consultation_time, (select auth.uid())
  ) returning id into created_consultation_id;
  return created_consultation_id;
end;
$$;

create function public.update_consultation_draft(
  target_consultation_id uuid,
  note_subjective text,
  note_objective text,
  note_assessment text,
  note_plan text,
  note_clinical_summary text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  consultation_row public.consultations;
begin
  select * into consultation_row from public.consultations
  where id = target_consultation_id;
  if consultation_row.id is null then raise exception 'Consultation not found'; end if;
  if not (select private.has_organization_role(
    consultation_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  if consultation_row.status <> 'draft' then
    raise exception 'Completed consultations are immutable';
  end if;

  update public.consultations set
    subjective = nullif(trim(note_subjective), ''),
    objective = nullif(trim(note_objective), ''),
    assessment = nullif(trim(note_assessment), ''),
    plan = nullif(trim(note_plan), ''),
    clinical_summary = nullif(trim(note_clinical_summary), '')
  where id = target_consultation_id;
end;
$$;

create function public.complete_consultation(target_consultation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  consultation_row public.consultations;
begin
  select * into consultation_row from public.consultations
  where id = target_consultation_id;
  if consultation_row.id is null then raise exception 'Consultation not found'; end if;
  if not (select private.has_organization_role(
    consultation_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  if consultation_row.status <> 'draft' then
    raise exception 'Completed consultations are immutable';
  end if;

  update public.consultations set
    status = 'completed', completed_at = now(), completed_by = (select auth.uid())
  where id = target_consultation_id;
end;
$$;

create function public.record_consultation_read(target_consultation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  consultation_row public.consultations;
begin
  select * into consultation_row from public.consultations
  where id = target_consultation_id;
  if consultation_row.id is null then raise exception 'Consultation not found'; end if;
  if not (select private.has_organization_role(
    consultation_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id
  ) values (
    consultation_row.organization_id, (select auth.uid()), 'read',
    'consultations', consultation_row.id
  );
end;
$$;

revoke all on function public.create_consultation(uuid,public.consultation_type,timestamptz) from public;
revoke all on function public.update_consultation_draft(uuid,text,text,text,text,text) from public;
revoke all on function public.complete_consultation(uuid) from public;
revoke all on function public.record_consultation_read(uuid) from public;
grant execute on function public.create_consultation(uuid,public.consultation_type,timestamptz) to authenticated;
grant execute on function public.update_consultation_draft(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.complete_consultation(uuid) to authenticated;
grant execute on function public.record_consultation_read(uuid) to authenticated;
