-- Public booking settings, availability, durable rate limits, and transactional reservations.

create table public.public_booking_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  is_enabled boolean not null default false,
  appointment_duration_minutes smallint not null default 60
    check (appointment_duration_minutes in (30, 45, 60, 90, 120)),
  minimum_notice_hours smallint not null default 12
    check (minimum_notice_hours between 1 and 168),
  booking_horizon_days smallint not null default 45
    check (booking_horizon_days between 7 and 120),
  default_modality public.appointment_modality not null default 'in_person',
  public_instructions text check (
    public_instructions is null or char_length(public_instructions) <= 1000
  ),
  privacy_consent_version text not null default 'public-booking-v1'
    check (char_length(privacy_consent_version) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  professional_user_id uuid not null references auth.users (id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at_local time not null,
  ends_at_local time not null,
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at_local > starts_at_local),
  unique (organization_id, professional_user_id, day_of_week, starts_at_local)
);

create index availability_rules_lookup_idx
  on public.availability_rules (organization_id, day_of_week, professional_user_id)
  where is_active;

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  professional_user_id uuid not null references auth.users (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  label text check (label is null or char_length(label) <= 120),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '31 days')
);

create index availability_blocks_lookup_idx
  on public.availability_blocks (organization_id, professional_user_id, starts_at, ends_at);

create table public.public_booking_rate_limits (
  fingerprint_hash text not null check (char_length(fingerprint_hash) = 64),
  scope text not null check (char_length(scope) between 1 and 160),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  primary key (fingerprint_hash, scope)
);

alter table public.patients alter column created_by drop not null;
alter table public.appointments alter column created_by drop not null;
alter table public.appointments
  add column booking_source text not null default 'staff'
    check (booking_source in ('staff', 'public')),
  add column privacy_consent_version text,
  add column privacy_consent_accepted_at timestamptz,
  add constraint appointments_privacy_consent_check check (
    (booking_source = 'staff' and privacy_consent_version is null and privacy_consent_accepted_at is null)
    or
    (booking_source = 'public' and privacy_consent_version is not null and privacy_consent_accepted_at is not null)
  );

create or replace function private.prevent_patient_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.organization_id <> old.organization_id
    or new.created_by is distinct from old.created_by then
    raise exception 'Patient identity, organization, and creator cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_appointment_identity_change()
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
    or new.created_by is distinct from old.created_by
    or new.booking_source <> old.booking_source
    or new.privacy_consent_version is distinct from old.privacy_consent_version
    or new.privacy_consent_accepted_at is distinct from old.privacy_consent_accepted_at then
    raise exception 'Appointment identity and schedule cannot be changed';
  end if;
  return new;
end;
$$;

create function private.create_default_public_booking_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.public_booking_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger organizations_create_public_booking_settings
  after insert on public.organizations
  for each row execute procedure private.create_default_public_booking_settings();

insert into public.public_booking_settings (organization_id)
select id from public.organizations
where deleted_at is null
on conflict (organization_id) do nothing;

create function private.prevent_booking_scope_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id
    or (to_jsonb(new) ? 'professional_user_id'
      and to_jsonb(new) ->> 'professional_user_id'
        is distinct from to_jsonb(old) ->> 'professional_user_id') then
    raise exception 'Booking scope cannot be changed';
  end if;
  return new;
end;
$$;

create function private.audit_booking_configuration_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_id uuid;
begin
  target_id := case
    when tg_table_name = 'public_booking_settings' then (row_data ->> 'organization_id')::uuid
    else (row_data ->> 'id')::uuid
  end;
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id
  ) values (
    (row_data ->> 'organization_id')::uuid,
    (select auth.uid()), lower(tg_op), tg_table_name, target_id
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger public_booking_settings_set_updated_at
  before update on public.public_booking_settings
  for each row execute procedure private.set_updated_at();
create trigger availability_rules_set_updated_at
  before update on public.availability_rules
  for each row execute procedure private.set_updated_at();
create trigger availability_rules_scope_guard
  before update on public.availability_rules
  for each row execute procedure private.prevent_booking_scope_change();
create trigger availability_blocks_scope_guard
  before update on public.availability_blocks
  for each row execute procedure private.prevent_booking_scope_change();

create trigger public_booking_settings_audit
  after update on public.public_booking_settings
  for each row execute procedure private.audit_booking_configuration_change();
create trigger availability_rules_audit
  after insert or update or delete on public.availability_rules
  for each row execute procedure private.audit_booking_configuration_change();
create trigger availability_blocks_audit
  after insert or update or delete on public.availability_blocks
  for each row execute procedure private.audit_booking_configuration_change();

alter table public.public_booking_settings enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.public_booking_rate_limits enable row level security;

revoke all on table public.public_booking_settings from anon, authenticated;
revoke all on table public.availability_rules from anon, authenticated;
revoke all on table public.availability_blocks from anon, authenticated;
revoke all on table public.public_booking_rate_limits from anon, authenticated;

grant select on table public.public_booking_settings to authenticated;
grant select on table public.availability_rules to authenticated;
grant select on table public.availability_blocks to authenticated;

create policy public_booking_settings_select_staff
  on public.public_booking_settings for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )));

create policy availability_rules_select_staff
  on public.availability_rules for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )));

create policy availability_blocks_select_staff
  on public.availability_blocks for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist', 'assistant']::public.app_role[]
  )));

create function private.require_booking_clinician(target_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.has_organization_role(
    target_organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then
    raise exception 'Booking configuration role required';
  end if;
end;
$$;

revoke all on function private.require_booking_clinician(uuid) from public;
grant execute on function private.require_booking_clinician(uuid) to authenticated;

create function public.save_public_booking_settings(
  target_organization_id uuid,
  booking_enabled boolean,
  duration_minutes smallint,
  notice_hours smallint,
  horizon_days smallint,
  booking_modality public.appointment_modality,
  booking_instructions text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_booking_clinician(target_organization_id);
  update public.public_booking_settings set
    is_enabled = booking_enabled,
    appointment_duration_minutes = duration_minutes,
    minimum_notice_hours = notice_hours,
    booking_horizon_days = horizon_days,
    default_modality = booking_modality,
    public_instructions = nullif(trim(booking_instructions), '')
  where organization_id = target_organization_id;
  if not found then raise exception 'Booking settings not found'; end if;
end;
$$;

create function public.create_availability_rule(
  target_organization_id uuid,
  target_professional_user_id uuid,
  weekday smallint,
  local_start time,
  local_end time
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_rule_id uuid;
begin
  perform private.require_booking_clinician(target_organization_id);
  if weekday not between 0 and 6 or local_end <= local_start then
    raise exception 'Invalid availability window';
  end if;
  if not exists (
    select 1 from public.organization_memberships
    where organization_id = target_organization_id
      and user_id = target_professional_user_id
      and status = 'active' and role in ('owner', 'nutritionist')
  ) then raise exception 'Professional is not active in organization'; end if;
  if exists (
    select 1 from public.availability_rules
    where organization_id = target_organization_id
      and professional_user_id = target_professional_user_id
      and day_of_week = weekday and is_active
      and starts_at_local < local_end and ends_at_local > local_start
  ) then raise exception 'Availability windows cannot overlap'; end if;
  insert into public.availability_rules (
    organization_id, professional_user_id, day_of_week,
    starts_at_local, ends_at_local, created_by
  ) values (
    target_organization_id, target_professional_user_id, weekday,
    local_start, local_end, (select auth.uid())
  ) returning id into created_rule_id;
  return created_rule_id;
end;
$$;

create function public.delete_availability_rule(target_rule_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule_row public.availability_rules;
begin
  select * into rule_row from public.availability_rules where id = target_rule_id;
  if rule_row.id is null then raise exception 'Availability rule not found'; end if;
  perform private.require_booking_clinician(rule_row.organization_id);
  delete from public.availability_rules where id = target_rule_id;
end;
$$;

create function public.create_availability_block(
  target_organization_id uuid,
  target_professional_user_id uuid,
  local_start timestamp without time zone,
  local_end timestamp without time zone,
  block_label text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_timezone text;
  calculated_start timestamptz;
  calculated_end timestamptz;
  created_block_id uuid;
begin
  perform private.require_booking_clinician(target_organization_id);
  if not exists (
    select 1 from public.organization_memberships
    where organization_id = target_organization_id
      and user_id = target_professional_user_id
      and status = 'active' and role in ('owner', 'nutritionist')
  ) then raise exception 'Professional is not active in organization'; end if;
  select timezone into organization_timezone from public.organizations
  where id = target_organization_id and deleted_at is null;
  calculated_start := local_start at time zone organization_timezone;
  calculated_end := local_end at time zone organization_timezone;
  if calculated_end <= calculated_start
    or calculated_end > calculated_start + interval '31 days' then
    raise exception 'Invalid availability block';
  end if;
  insert into public.availability_blocks (
    organization_id, professional_user_id, starts_at, ends_at, label, created_by
  ) values (
    target_organization_id, target_professional_user_id,
    calculated_start, calculated_end, nullif(trim(block_label), ''), (select auth.uid())
  ) returning id into created_block_id;
  return created_block_id;
end;
$$;

create function public.delete_availability_block(target_block_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  block_row public.availability_blocks;
begin
  select * into block_row from public.availability_blocks where id = target_block_id;
  if block_row.id is null then raise exception 'Availability block not found'; end if;
  perform private.require_booking_clinician(block_row.organization_id);
  delete from public.availability_blocks where id = target_block_id;
end;
$$;

create function public.get_public_booking_context(booking_slug text)
returns table (
  organization_name text,
  organization_slug text,
  brand_color text,
  contact_phone text,
  clinic_timezone text,
  appointment_duration_minutes smallint,
  minimum_notice_hours smallint,
  booking_horizon_days smallint,
  public_instructions text,
  privacy_consent_version text
)
language sql
security definer
set search_path = ''
stable
as $$
  select organization.name, organization.slug, organization.brand_color,
    organization.phone_e164, organization.timezone,
    settings.appointment_duration_minutes, settings.minimum_notice_hours,
    settings.booking_horizon_days, settings.public_instructions,
    settings.privacy_consent_version
  from public.organizations as organization
  join public.public_booking_settings as settings
    on settings.organization_id = organization.id
  where organization.slug = booking_slug
    and organization.deleted_at is null
    and settings.is_enabled
    and exists (
      select 1 from public.availability_rules as rule
      where rule.organization_id = organization.id and rule.is_active
    );
$$;

create function public.list_public_booking_slots(
  booking_slug text,
  target_start_date date,
  requested_days smallint default 7
)
returns table (
  professional_user_id uuid,
  professional_name text,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  with configuration as (
    select organization.id as organization_id, organization.timezone,
      settings.appointment_duration_minutes as duration_minutes,
      settings.minimum_notice_hours, settings.booking_horizon_days,
      (now() at time zone organization.timezone)::date as clinic_today
    from public.organizations as organization
    join public.public_booking_settings as settings
      on settings.organization_id = organization.id
    where organization.slug = booking_slug
      and organization.deleted_at is null and settings.is_enabled
      and requested_days between 1 and 14
  ), dates as (
    select generated_date::date as local_date
    from configuration,
      generate_series(
        greatest(target_start_date, clinic_today)::timestamp,
        least(
          target_start_date + requested_days - 1,
          clinic_today + booking_horizon_days
        )::timestamp,
        interval '1 day'
      ) as generated_date
  ), candidates as (
    select rule.organization_id, rule.professional_user_id, profile.full_name,
      (
        dates.local_date::timestamp
        + rule.starts_at_local
        + make_interval(mins => slot_number * configuration.duration_minutes)
      ) at time zone configuration.timezone as slot_start,
      configuration.duration_minutes
    from configuration
    join dates on true
    join public.availability_rules as rule
      on rule.organization_id = configuration.organization_id
      and rule.day_of_week = extract(dow from dates.local_date)::smallint
      and rule.is_active
    join public.organization_memberships as membership
      on membership.organization_id = rule.organization_id
      and membership.user_id = rule.professional_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'nutritionist')
    join public.profiles as profile on profile.user_id = rule.professional_user_id
    cross join lateral generate_series(
      0,
      greatest(
        floor(extract(epoch from (rule.ends_at_local - rule.starts_at_local)) / 60
          / configuration.duration_minutes)::integer - 1,
        -1
      )
    ) as slot_number
    where (
      dates.local_date::timestamp + rule.starts_at_local
      + make_interval(mins => slot_number * configuration.duration_minutes)
    ) at time zone configuration.timezone >= now() + make_interval(hours => configuration.minimum_notice_hours)
  )
  select candidate.professional_user_id, candidate.full_name,
    candidate.slot_start,
    candidate.slot_start + make_interval(mins => candidate.duration_minutes)
  from candidates as candidate
  where not exists (
    select 1 from public.availability_blocks as block
    where block.organization_id = candidate.organization_id
      and block.professional_user_id = candidate.professional_user_id
      and tstzrange(block.starts_at, block.ends_at, '[)')
        && tstzrange(
          candidate.slot_start,
          candidate.slot_start + make_interval(mins => candidate.duration_minutes),
          '[)'
        )
  ) and not exists (
    select 1 from public.appointments as appointment
    where appointment.organization_id = candidate.organization_id
      and appointment.professional_user_id = candidate.professional_user_id
      and appointment.status not in ('cancelled', 'rescheduled')
      and tstzrange(appointment.starts_at, appointment.ends_at, '[)')
        && tstzrange(
          candidate.slot_start,
          candidate.slot_start + make_interval(mins => candidate.duration_minutes),
          '[)'
        )
  )
  order by candidate.slot_start, candidate.full_name;
$$;

create function public.consume_public_booking_rate_limit(
  rate_fingerprint_hash text,
  rate_scope text,
  maximum_requests integer,
  window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  if rate_fingerprint_hash !~ '^[0-9a-f]{64}$'
    or char_length(rate_scope) not between 1 and 160
    or maximum_requests not between 1 and 100
    or window_seconds not between 60 and 86400 then
    raise exception 'Invalid rate limit';
  end if;
  delete from public.public_booking_rate_limits
  where window_started_at < now() - interval '2 days';
  insert into public.public_booking_rate_limits (
    fingerprint_hash, scope, window_started_at, request_count
  ) values (rate_fingerprint_hash, rate_scope, now(), 1)
  on conflict (fingerprint_hash, scope) do update set
    request_count = case
      when public.public_booking_rate_limits.window_started_at
        <= now() - make_interval(secs => window_seconds) then 1
      else public.public_booking_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.public_booking_rate_limits.window_started_at
        <= now() - make_interval(secs => window_seconds) then now()
      else public.public_booking_rate_limits.window_started_at
    end
  returning request_count <= maximum_requests into allowed;
  return allowed;
end;
$$;

create function public.create_public_booking(
  booking_slug text,
  target_professional_user_id uuid,
  selected_start timestamptz,
  patient_first_name text,
  patient_last_name text,
  patient_birth_date date,
  patient_phone_e164 text,
  patient_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_row public.organizations;
  settings_row public.public_booking_settings;
  matched_patient_id uuid;
  created_appointment_id uuid;
  selected_end timestamptz;
begin
  select organization.* into organization_row
  from public.organizations as organization
  join public.public_booking_settings as settings
    on settings.organization_id = organization.id
  where organization.slug = booking_slug
    and organization.deleted_at is null and settings.is_enabled;
  if organization_row.id is null then raise exception 'Booking unavailable'; end if;
  select * into settings_row from public.public_booking_settings
  where organization_id = organization_row.id;
  if char_length(trim(patient_first_name)) not between 1 and 80
    or char_length(trim(patient_last_name)) not between 1 and 80
    or patient_birth_date > current_date
    or patient_birth_date < current_date - interval '120 years'
    or patient_phone_e164 !~ '^\+[1-9][0-9]{7,14}$'
    or (patient_email is not null and char_length(trim(patient_email)) > 254) then
    raise exception 'Booking unavailable';
  end if;
  if not exists (
    select 1 from public.list_public_booking_slots(
      booking_slug,
      (selected_start at time zone organization_row.timezone)::date,
      1::smallint
    ) as slot
    where slot.professional_user_id = target_professional_user_id
      and slot.starts_at = selected_start
  ) then raise exception 'Booking unavailable'; end if;
  selected_end := selected_start + make_interval(mins => settings_row.appointment_duration_minutes);

  select patient.id into matched_patient_id
  from public.patients as patient
  where patient.organization_id = organization_row.id
    and patient.deleted_at is null
    and patient.birth_date = patient_birth_date
    and patient.phone_e164 = patient_phone_e164
    and lower(patient.first_name) = lower(trim(patient_first_name))
    and lower(patient.last_name) = lower(trim(patient_last_name))
  order by patient.created_at
  limit 1;

  if matched_patient_id is null then
    insert into public.patients (
      organization_id, first_name, last_name, birth_date,
      phone_e164, email, created_by
    ) values (
      organization_row.id, trim(patient_first_name), trim(patient_last_name),
      patient_birth_date, patient_phone_e164,
      nullif(lower(trim(patient_email)), ''), null
    ) returning id into matched_patient_id;
  end if;

  insert into public.appointments (
    organization_id, patient_id, professional_user_id, starts_at, ends_at,
    modality, status, created_by, booking_source,
    privacy_consent_version, privacy_consent_accepted_at
  ) values (
    organization_row.id, matched_patient_id, target_professional_user_id,
    selected_start, selected_end, settings_row.default_modality, 'pending', null,
    'public', settings_row.privacy_consent_version, now()
  ) returning id into created_appointment_id;
  return created_appointment_id;
exception
  when exclusion_violation then raise exception 'Booking unavailable';
end;
$$;

revoke all on function public.save_public_booking_settings(uuid, boolean, smallint, smallint, smallint, public.appointment_modality, text) from public;
revoke all on function public.create_availability_rule(uuid, uuid, smallint, time, time) from public;
revoke all on function public.delete_availability_rule(uuid) from public;
revoke all on function public.create_availability_block(uuid, uuid, timestamp without time zone, timestamp without time zone, text) from public;
revoke all on function public.delete_availability_block(uuid) from public;
revoke all on function public.get_public_booking_context(text) from public;
revoke all on function public.list_public_booking_slots(text, date, smallint) from public;
revoke all on function public.consume_public_booking_rate_limit(text, text, integer, integer) from public;
revoke all on function public.create_public_booking(text, uuid, timestamptz, text, text, date, text, text) from public;

grant execute on function public.save_public_booking_settings(uuid, boolean, smallint, smallint, smallint, public.appointment_modality, text) to authenticated;
grant execute on function public.create_availability_rule(uuid, uuid, smallint, time, time) to authenticated;
grant execute on function public.delete_availability_rule(uuid) to authenticated;
grant execute on function public.create_availability_block(uuid, uuid, timestamp without time zone, timestamp without time zone, text) to authenticated;
grant execute on function public.delete_availability_block(uuid) to authenticated;
grant execute on function public.get_public_booking_context(text) to service_role;
grant execute on function public.list_public_booking_slots(text, date, smallint) to service_role;
grant execute on function public.consume_public_booking_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.create_public_booking(text, uuid, timestamptz, text, text, date, text, text) to service_role;
