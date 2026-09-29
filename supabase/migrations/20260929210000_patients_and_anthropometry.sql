-- Patient administration, consent, clinical profile, and adult anthropometry.

create type public.patient_status as enum ('active', 'inactive', 'archived');
create type public.growth_reference_sex as enum ('female', 'male');
create type public.adult_bmi_classification as enum (
  'severe_thinness',
  'moderate_thinness',
  'underweight',
  'normal',
  'overweight',
  'obesity_i',
  'obesity_ii',
  'obesity_iii'
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  preferred_name text check (preferred_name is null or char_length(preferred_name) between 1 and 80),
  birth_date date not null check (birth_date <= current_date),
  growth_reference_sex public.growth_reference_sex,
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email is null or char_length(email) <= 254),
  status public.patient_status not null default 'active',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index patients_organization_status_idx
  on public.patients (organization_id, status, created_at desc)
  where deleted_at is null;
create index patients_organization_name_idx
  on public.patients (
    organization_id,
    lower(first_name || ' ' || last_name)
  )
  where deleted_at is null;
create index patients_organization_phone_idx
  on public.patients (organization_id, phone_e164)
  where deleted_at is null and phone_e164 is not null;
alter table public.patients
  add constraint patients_id_organization_key unique (id, organization_id);

create table public.patient_clinical_profiles (
  patient_id uuid primary key references public.patients (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  goal text check (goal is null or char_length(goal) <= 1000),
  consultation_reason text check (consultation_reason is null or char_length(consultation_reason) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patient_clinical_profiles_org_idx
  on public.patient_clinical_profiles (organization_id, patient_id);
alter table public.patient_clinical_profiles
  add constraint patient_clinical_profiles_patient_org_fkey
  foreign key (patient_id, organization_id)
  references public.patients (id, organization_id) on delete restrict;

create table public.patient_consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  accepted_at timestamptz not null,
  withdrawn_at timestamptz check (withdrawn_at is null or withdrawn_at >= accepted_at),
  recorded_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index patient_consents_active_version_key
  on public.patient_consents (patient_id, consent_version)
  where withdrawn_at is null;
create index patient_consents_org_patient_idx
  on public.patient_consents (organization_id, patient_id, accepted_at desc);
alter table public.patient_consents
  add constraint patient_consents_patient_org_fkey
  foreign key (patient_id, organization_id)
  references public.patients (id, organization_id) on delete restrict;

create table public.anthropometric_measurements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6,2) not null check (weight_kg between 20 and 300),
  height_cm numeric(6,2) not null check (height_cm between 50 and 250),
  weight_lb numeric(7,2) not null,
  bmi numeric(5,2) not null,
  bmi_classification public.adult_bmi_classification not null,
  normal_weight_min_kg numeric(6,2) not null,
  normal_weight_max_kg numeric(6,2) not null,
  estimated_body_fat_percent numeric(5,2),
  age_years_snapshot integer not null check (age_years_snapshot >= 18),
  formula_version text not null default 'adult-anthropometry-v1',
  recorded_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index anthropometric_measurements_patient_date_idx
  on public.anthropometric_measurements (patient_id, measured_at desc);
create index anthropometric_measurements_org_date_idx
  on public.anthropometric_measurements (organization_id, measured_at desc);
alter table public.anthropometric_measurements
  add constraint anthropometric_measurements_patient_org_fkey
  foreign key (patient_id, organization_id)
  references public.patients (id, organization_id) on delete restrict;

create function private.patient_organization_id(target_patient_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select patient.organization_id
  from public.patients as patient
  where patient.id = target_patient_id
    and patient.deleted_at is null;
$$;

revoke all on function private.patient_organization_id(uuid) from public;
grant execute on function private.patient_organization_id(uuid) to authenticated;

create function private.prevent_patient_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.organization_id <> old.organization_id
    or new.created_by <> old.created_by then
    raise exception 'Patient identity, organization, and creator cannot be changed';
  end if;
  return new;
end;
$$;

create function private.prevent_patient_child_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.patient_id <> old.patient_id or new.organization_id <> old.organization_id then
    raise exception 'Patient and organization cannot be changed';
  end if;
  return new;
end;
$$;

create function private.audit_patient_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id uuid;
begin
  row_id := coalesce(new.id, old.id);
  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id
  ) values (
    coalesce(new.organization_id, old.organization_id),
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    row_id
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function private.audit_patient_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid;
  target_patient_id uuid;
begin
  record_id := coalesce(
    (to_jsonb(new) ->> 'id')::uuid,
    (to_jsonb(old) ->> 'id')::uuid
  );
  target_patient_id := coalesce(new.patient_id, old.patient_id);

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    coalesce(new.organization_id, old.organization_id),
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    target_patient_id,
    case
      when record_id is null then '{}'::jsonb
      else jsonb_build_object('record_id', record_id)
    end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute procedure private.set_updated_at();
create trigger patients_identity_guard
  before update on public.patients
  for each row execute procedure private.prevent_patient_identity_change();
create trigger patients_audit
  after insert or update on public.patients
  for each row execute procedure private.audit_patient_change();

create trigger patient_clinical_profiles_set_updated_at
  before update on public.patient_clinical_profiles
  for each row execute procedure private.set_updated_at();
create trigger patient_clinical_profiles_identity_guard
  before update on public.patient_clinical_profiles
  for each row execute procedure private.prevent_patient_child_identity_change();
create trigger patient_clinical_profiles_audit
  after insert or update on public.patient_clinical_profiles
  for each row execute procedure private.audit_patient_child_change();

create trigger patient_consents_identity_guard
  before update on public.patient_consents
  for each row execute procedure private.prevent_patient_child_identity_change();
create trigger anthropometric_measurements_identity_guard
  before update on public.anthropometric_measurements
  for each row execute procedure private.prevent_patient_child_identity_change();

create trigger patient_consents_audit
  after insert or update on public.patient_consents
  for each row execute procedure private.audit_patient_child_change();
create trigger anthropometric_measurements_audit
  after insert on public.anthropometric_measurements
  for each row execute procedure private.audit_patient_child_change();

alter table public.patients enable row level security;
alter table public.patient_clinical_profiles enable row level security;
alter table public.patient_consents enable row level security;
alter table public.anthropometric_measurements enable row level security;

revoke all on table public.patients from anon, authenticated;
revoke all on table public.patient_clinical_profiles from anon, authenticated;
revoke all on table public.patient_consents from anon, authenticated;
revoke all on table public.anthropometric_measurements from anon, authenticated;

grant select on table public.patients to authenticated;
grant update (first_name, last_name, preferred_name, birth_date, growth_reference_sex, phone_e164, email, status, deleted_at)
  on table public.patients to authenticated;
grant select on table public.patient_clinical_profiles to authenticated;
grant update (goal, consultation_reason)
  on table public.patient_clinical_profiles to authenticated;
grant select on table public.patient_consents to authenticated;
grant update (withdrawn_at) on table public.patient_consents to authenticated;
grant select on table public.anthropometric_measurements to authenticated;

create policy patients_select_staff
  on public.patients for select to authenticated
  using (
    deleted_at is null
    and (select private.has_organization_role(
      organization_id,
      array['owner', 'nutritionist', 'assistant']::public.app_role[]
    ))
  );

create policy patients_update_staff
  on public.patients for update to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )))
  with check ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )));

create policy patient_clinical_profiles_select_clinician
  on public.patient_clinical_profiles for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )));

create policy patient_clinical_profiles_update_clinician
  on public.patient_clinical_profiles for update to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )))
  with check ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )));

create policy patient_consents_select_staff
  on public.patient_consents for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )));

create policy patient_consents_update_staff
  on public.patient_consents for update to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )))
  with check ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )));

create policy anthropometric_measurements_select_clinician
  on public.anthropometric_measurements for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )));

create function public.create_patient(
  target_organization_id uuid,
  patient_first_name text,
  patient_last_name text,
  patient_birth_date date,
  patient_growth_reference_sex public.growth_reference_sex,
  patient_phone_e164 text,
  patient_email text,
  patient_goal text,
  patient_consultation_reason text,
  accepted_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_patient_id uuid;
  is_clinician boolean;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.organizations
    where id = target_organization_id and deleted_at is null
  ) then raise exception 'Organization not found'; end if;
  if not (select private.has_organization_role(
    target_organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )) then raise exception 'Insufficient organization role'; end if;

  is_clinician := (select private.has_organization_role(
    target_organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  ));
  if not is_clinician and (patient_goal is not null or patient_consultation_reason is not null) then
    raise exception 'Assistants cannot create clinical profile data';
  end if;
  if not accepted_consent then raise exception 'Active consent is required'; end if;

  insert into public.patients (
    organization_id, first_name, last_name, birth_date,
    growth_reference_sex, phone_e164, email, created_by
  ) values (
    target_organization_id, trim(patient_first_name), trim(patient_last_name),
    patient_birth_date, patient_growth_reference_sex,
    nullif(trim(patient_phone_e164), ''), nullif(lower(trim(patient_email)), ''),
    (select auth.uid())
  ) returning id into created_patient_id;

  if is_clinician then
    insert into public.patient_clinical_profiles (
      patient_id, organization_id, goal, consultation_reason
    ) values (
      created_patient_id, target_organization_id,
      nullif(trim(patient_goal), ''), nullif(trim(patient_consultation_reason), '')
    );
  end if;

  insert into public.patient_consents (
    patient_id, organization_id, consent_version, accepted_at, recorded_by
  ) values (
    created_patient_id, target_organization_id, 'clinical-data-v1', now(), (select auth.uid())
  );

  return created_patient_id;
end;
$$;

create function public.record_adult_anthropometry(
  target_patient_id uuid,
  measured_weight_kg numeric,
  measured_height_cm numeric,
  measurement_time timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_row public.patients;
  calculated_age integer;
  calculated_bmi numeric;
  classification public.adult_bmi_classification;
  body_fat numeric;
  created_measurement_id uuid;
begin
  select * into patient_row
  from public.patients
  where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  if measured_weight_kg not between 20 and 300 then raise exception 'Weight outside adult bounds'; end if;
  if measured_height_cm not between 50 and 250 then raise exception 'Height outside adult bounds'; end if;

  calculated_age := date_part('year', age(measurement_time::date, patient_row.birth_date));
  if calculated_age < 18 then raise exception 'Adult calculation requires age 18 or older'; end if;

  calculated_bmi := round(measured_weight_kg / power(measured_height_cm / 100, 2), 2);
  classification := case
    when calculated_bmi < 16 then 'severe_thinness'::public.adult_bmi_classification
    when calculated_bmi < 17 then 'moderate_thinness'::public.adult_bmi_classification
    when calculated_bmi < 18.5 then 'underweight'::public.adult_bmi_classification
    when calculated_bmi < 25 then 'normal'::public.adult_bmi_classification
    when calculated_bmi < 30 then 'overweight'::public.adult_bmi_classification
    when calculated_bmi < 35 then 'obesity_i'::public.adult_bmi_classification
    when calculated_bmi < 40 then 'obesity_ii'::public.adult_bmi_classification
    else 'obesity_iii'::public.adult_bmi_classification
  end;

  if patient_row.growth_reference_sex is not null then
    body_fat := round(
      1.20 * calculated_bmi + 0.23 * calculated_age
      - 10.8 * case when patient_row.growth_reference_sex = 'male' then 1 else 0 end
      - 5.4,
      2
    );
  end if;

  insert into public.anthropometric_measurements (
    patient_id, organization_id, measured_at, weight_kg, height_cm,
    weight_lb, bmi, bmi_classification, normal_weight_min_kg,
    normal_weight_max_kg, estimated_body_fat_percent, age_years_snapshot,
    recorded_by
  ) values (
    patient_row.id, patient_row.organization_id, measurement_time,
    measured_weight_kg, measured_height_cm, round(measured_weight_kg * 2.20462, 2),
    calculated_bmi, classification,
    round(18.5 * power(measured_height_cm / 100, 2), 2),
    round(24.9 * power(measured_height_cm / 100, 2), 2),
    case when body_fat is null then null else greatest(body_fat, 0) end,
    calculated_age, (select auth.uid())
  ) returning id into created_measurement_id;

  return created_measurement_id;
end;
$$;

create function public.record_clinical_read(
  target_patient_id uuid,
  target_entity_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
begin
  target_organization_id := (select private.patient_organization_id(target_patient_id));
  if target_organization_id is null then raise exception 'Patient not found'; end if;
  if target_entity_type not in ('patient_clinical_profile', 'anthropometric_measurements') then
    raise exception 'Unsupported clinical entity type';
  end if;
  if not (select private.has_organization_role(
    target_organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;

  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id
  ) values (
    target_organization_id, (select auth.uid()), 'read', target_entity_type, target_patient_id
  );
end;
$$;

revoke all on function public.create_patient(uuid, text, text, date, public.growth_reference_sex, text, text, text, text, boolean) from public;
revoke all on function public.record_adult_anthropometry(uuid, numeric, numeric, timestamptz) from public;
revoke all on function public.record_clinical_read(uuid, text) from public;
grant execute on function public.create_patient(uuid, text, text, date, public.growth_reference_sex, text, text, text, text, boolean) to authenticated;
grant execute on function public.record_adult_anthropometry(uuid, numeric, numeric, timestamptz) to authenticated;
grant execute on function public.record_clinical_read(uuid, text) to authenticated;

comment on function public.record_adult_anthropometry(uuid, numeric, numeric, timestamptz) is
  'Records versioned adult-only weight/height calculations. Paediatric references are intentionally excluded.';
