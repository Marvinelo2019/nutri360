-- Expiring, single-use pre-consultation intake links and immutable submissions.

create table public.intake_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  consent_version text not null default 'pre-consultation-v1'
    check (char_length(consent_version) between 1 and 40),
  expires_at timestamptz not null,
  completed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  revoked_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intake_invites_patient_org_fkey foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict,
  constraint intake_invites_id_scope_key unique (id, organization_id, patient_id),
  constraint intake_invites_expiry_check check (expires_at > created_at),
  constraint intake_invites_state_check check (
    not (completed_at is not null and revoked_at is not null)
    and ((revoked_at is null and revoked_by is null) or (revoked_at is not null and revoked_by is not null))
  )
);

create index intake_invites_patient_created_idx
  on public.intake_invites (patient_id, created_at desc);
create index intake_invites_active_idx
  on public.intake_invites (expires_at)
  where completed_at is null and revoked_at is null;

create table public.intake_submissions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete restrict,
  medical_history text check (medical_history is null or char_length(medical_history) <= 8000),
  family_history text check (family_history is null or char_length(family_history) <= 4000),
  allergies text check (allergies is null or char_length(allergies) <= 4000),
  medications text check (medications is null or char_length(medications) <= 4000),
  recall_24h text check (recall_24h is null or char_length(recall_24h) <= 12000),
  eating_habits text check (eating_habits is null or char_length(eating_habits) <= 8000),
  water_liters numeric(4,2) check (water_liters is null or water_liters between 0 and 20),
  sleep_hours numeric(4,2) check (sleep_hours is null or sleep_hours between 0 and 24),
  physical_activity text check (physical_activity is null or char_length(physical_activity) <= 4000),
  preferences text check (preferences is null or char_length(preferences) <= 4000),
  restrictions text check (restrictions is null or char_length(restrictions) <= 4000),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consent_accepted_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  constraint intake_submissions_invite_scope_fkey
    foreign key (invite_id, organization_id, patient_id)
    references public.intake_invites (id, organization_id, patient_id) on delete restrict,
  constraint intake_submissions_patient_org_fkey foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict
);

create index intake_submissions_patient_submitted_idx
  on public.intake_submissions (patient_id, submitted_at desc);

create function private.prevent_intake_invite_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id
    or new.organization_id <> old.organization_id
    or new.patient_id <> old.patient_id
    or new.token_hash <> old.token_hash
    or new.consent_version <> old.consent_version
    or new.expires_at <> old.expires_at
    or new.created_by <> old.created_by
    or new.created_at <> old.created_at then
    raise exception 'Intake invitation identity cannot be changed';
  end if;
  if old.completed_at is not null and new.completed_at is distinct from old.completed_at then
    raise exception 'Completed intake invitation cannot be reopened';
  end if;
  if old.revoked_at is not null and (
    new.revoked_at is distinct from old.revoked_at or new.revoked_by is distinct from old.revoked_by
  ) then
    raise exception 'Revoked intake invitation cannot be reopened';
  end if;
  return new;
end;
$$;

create function private.prevent_intake_submission_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Intake submissions are immutable';
end;
$$;

create trigger intake_invites_set_updated_at before update on public.intake_invites
  for each row execute procedure private.set_updated_at();
create trigger intake_invites_identity_guard before update on public.intake_invites
  for each row execute procedure private.prevent_intake_invite_identity_change();
create trigger intake_submissions_immutable before update or delete on public.intake_submissions
  for each row execute procedure private.prevent_intake_submission_change();
create trigger intake_invites_audit after insert or update on public.intake_invites
  for each row execute procedure private.audit_patient_child_change();
create trigger intake_submissions_audit after insert on public.intake_submissions
  for each row execute procedure private.audit_patient_child_change();

alter table public.intake_invites enable row level security;
alter table public.intake_submissions enable row level security;
revoke all on table public.intake_invites from anon, authenticated;
revoke all on table public.intake_submissions from anon, authenticated;
grant select on table public.intake_invites to authenticated;
grant select on table public.intake_submissions to authenticated;

create policy intake_invites_select_clinician on public.intake_invites
  for select to authenticated using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist']::public.app_role[])));
create policy intake_submissions_select_clinician on public.intake_submissions
  for select to authenticated using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist']::public.app_role[])));

create function public.create_intake_invite(
  target_patient_id uuid,
  intake_token_hash text,
  intake_expires_at timestamptz
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare patient_row public.patients; created_invite_id uuid;
begin
  select * into patient_row from public.patients
  where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id, array['owner','nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  if intake_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid token hash'; end if;
  if intake_expires_at < now() + interval '1 hour'
    or intake_expires_at > now() + interval '30 days' then
    raise exception 'Invalid invitation expiry';
  end if;

  insert into public.intake_invites (
    organization_id, patient_id, token_hash, expires_at, created_by
  ) values (
    patient_row.organization_id, patient_row.id, intake_token_hash, intake_expires_at, (select auth.uid())
  ) returning id into created_invite_id;
  return created_invite_id;
end;
$$;

create function public.revoke_intake_invite(target_invite_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare invite_row public.intake_invites;
begin
  select * into invite_row from public.intake_invites where id = target_invite_id for update;
  if invite_row.id is null then raise exception 'Invitation not found'; end if;
  if not (select private.has_organization_role(
    invite_row.organization_id, array['owner','nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  if invite_row.completed_at is not null then raise exception 'Invitation already completed'; end if;
  if invite_row.revoked_at is null then
    update public.intake_invites set revoked_at = now(), revoked_by = (select auth.uid())
    where id = target_invite_id;
  end if;
end;
$$;

create function public.get_public_intake_context(intake_token_hash text)
returns table (
  organization_name text,
  brand_color text,
  contact_phone text,
  consent_version text
) language sql security definer stable set search_path = '' as $$
  select o.name, o.brand_color, o.phone_e164, i.consent_version
  from public.intake_invites i
  join public.organizations o on o.id = i.organization_id
  join public.patients p on p.id = i.patient_id and p.organization_id = i.organization_id
  where i.token_hash = intake_token_hash
    and i.expires_at > now()
    and i.completed_at is null
    and i.revoked_at is null
    and p.deleted_at is null
    and o.deleted_at is null;
$$;

create function public.submit_public_intake(
  intake_token_hash text,
  intake_medical_history text,
  intake_family_history text,
  intake_allergies text,
  intake_medications text,
  intake_recall_24h text,
  intake_eating_habits text,
  intake_water_liters numeric,
  intake_sleep_hours numeric,
  intake_physical_activity text,
  intake_preferences text,
  intake_restrictions text,
  accepted_consent_version text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite_row public.intake_invites; created_submission_id uuid;
begin
  select * into invite_row from public.intake_invites
  where token_hash = intake_token_hash for update;
  if invite_row.id is null
    or invite_row.expires_at <= now()
    or invite_row.completed_at is not null
    or invite_row.revoked_at is not null then
    raise exception 'Intake link unavailable';
  end if;
  if accepted_consent_version <> invite_row.consent_version then
    raise exception 'Consent version mismatch';
  end if;

  insert into public.intake_submissions (
    invite_id, organization_id, patient_id, medical_history, family_history,
    allergies, medications, recall_24h, eating_habits, water_liters, sleep_hours,
    physical_activity, preferences, restrictions, consent_version, consent_accepted_at
  ) values (
    invite_row.id, invite_row.organization_id, invite_row.patient_id,
    nullif(trim(intake_medical_history),''), nullif(trim(intake_family_history),''),
    nullif(trim(intake_allergies),''), nullif(trim(intake_medications),''),
    nullif(trim(intake_recall_24h),''), nullif(trim(intake_eating_habits),''),
    intake_water_liters, intake_sleep_hours, nullif(trim(intake_physical_activity),''),
    nullif(trim(intake_preferences),''), nullif(trim(intake_restrictions),''),
    invite_row.consent_version, now()
  ) returning id into created_submission_id;

  update public.intake_invites set completed_at = now() where id = invite_row.id;
  return created_submission_id;
end;
$$;

revoke all on function public.create_intake_invite(uuid,text,timestamptz) from public;
revoke all on function public.revoke_intake_invite(uuid) from public;
revoke all on function public.get_public_intake_context(text) from public;
revoke all on function public.submit_public_intake(text,text,text,text,text,text,text,numeric,numeric,text,text,text,text) from public;
grant execute on function public.create_intake_invite(uuid,text,timestamptz) to authenticated;
grant execute on function public.revoke_intake_invite(uuid) to authenticated;
grant execute on function public.get_public_intake_context(text) to service_role;
grant execute on function public.submit_public_intake(text,text,text,text,text,text,text,numeric,numeric,text,text,text,text) to service_role;
