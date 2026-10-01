-- Provider-neutral, idempotent appointment reminder queue.

create type public.reminder_channel as enum ('whatsapp', 'sms', 'email');
create type public.reminder_kind as enum ('confirmation', 'reminder_24h', 'reminder_2h');
create type public.reminder_status as enum (
  'queued', 'processing', 'sent', 'failed', 'blocked', 'cancelled'
);
create type public.reminder_attempt_outcome as enum ('sent', 'failed');

alter table public.appointments
  add constraint appointments_id_org_key unique (id, organization_id);

create table public.reminder_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  preferred_channel public.reminder_channel not null default 'whatsapp',
  confirmation_enabled boolean not null default true,
  reminder_24h_enabled boolean not null default true,
  reminder_2h_enabled boolean not null default true,
  max_attempts smallint not null default 3 check (max_attempts between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  appointment_id uuid not null,
  kind public.reminder_kind not null,
  channel public.reminder_channel not null,
  scheduled_at timestamptz not null,
  next_attempt_at timestamptz not null,
  status public.reminder_status not null default 'queued',
  attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
  max_attempts smallint not null check (max_attempts between 1 and 5),
  locked_at timestamptz,
  locked_by text check (locked_by is null or char_length(locked_by) between 1 and 120),
  sent_at timestamptz,
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 240
  ),
  last_error_code text check (
    last_error_code is null or last_error_code ~ '^[a-z0-9_]{2,80}$'
  ),
  idempotency_key text not null check (char_length(idempotency_key) between 10 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (appointment_id, organization_id)
    references public.appointments (id, organization_id) on delete restrict,
  unique (appointment_id, kind),
  unique (idempotency_key),
  check (
    (status = 'processing' and locked_at is not null and locked_by is not null)
    or (status <> 'processing')
  ),
  check ((status = 'sent' and sent_at is not null) or status <> 'sent')
);

create index appointment_reminders_due_idx
  on public.appointment_reminders (next_attempt_at, created_at)
  where status in ('queued', 'processing');
create index appointment_reminders_org_status_idx
  on public.appointment_reminders (organization_id, status, scheduled_at);

create table public.reminder_delivery_attempts (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  reminder_id uuid not null references public.appointment_reminders (id) on delete restrict,
  attempt_number smallint not null check (attempt_number between 1 and 5),
  outcome public.reminder_attempt_outcome not null,
  provider text not null check (char_length(provider) between 2 and 80),
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 240
  ),
  error_code text check (error_code is null or error_code ~ '^[a-z0-9_]{2,80}$'),
  attempted_at timestamptz not null default now(),
  unique (reminder_id, attempt_number),
  check (
    (outcome = 'sent' and provider_message_id is not null and error_code is null)
    or (outcome = 'failed' and error_code is not null)
  )
);

create index reminder_delivery_attempts_org_time_idx
  on public.reminder_delivery_attempts (organization_id, attempted_at desc);

create trigger reminder_settings_set_updated_at
  before update on public.reminder_settings
  for each row execute procedure private.set_updated_at();
create trigger appointment_reminders_set_updated_at
  before update on public.appointment_reminders
  for each row execute procedure private.set_updated_at();

create function private.patient_has_reminder_contact(
  target_patient_id uuid,
  target_channel public.reminder_channel
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select case
    when target_channel = 'email' then patient.email is not null
    else patient.phone_e164 is not null
  end
  from public.patients as patient
  where patient.id = target_patient_id and patient.deleted_at is null;
$$;

revoke all on function private.patient_has_reminder_contact(uuid,public.reminder_channel) from public;
grant execute on function private.patient_has_reminder_contact(uuid,public.reminder_channel) to authenticated, service_role;

create function private.schedule_appointment_reminders(
  target_appointment_id uuid,
  include_confirmation boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments;
  settings_row public.reminder_settings;
  has_contact boolean;
begin
  select * into appointment_row from public.appointments
  where id = target_appointment_id;
  if appointment_row.id is null
    or appointment_row.status in ('completed','no_show','cancelled','rescheduled') then
    return;
  end if;
  select * into settings_row from public.reminder_settings
  where organization_id = appointment_row.organization_id;
  if settings_row.organization_id is null then return; end if;
  has_contact := coalesce((select private.patient_has_reminder_contact(
    appointment_row.patient_id, settings_row.preferred_channel
  )), false);

  if include_confirmation and settings_row.confirmation_enabled then
    insert into public.appointment_reminders (
      organization_id, appointment_id, kind, channel, scheduled_at,
      next_attempt_at, status, max_attempts, idempotency_key,
      last_error_code
    ) values (
      appointment_row.organization_id, appointment_row.id, 'confirmation',
      settings_row.preferred_channel, now(), now(),
      case when has_contact then 'queued'::public.reminder_status
        else 'blocked'::public.reminder_status end,
      settings_row.max_attempts,
      appointment_row.id::text || ':confirmation',
      case when has_contact then null else 'missing_contact' end
    ) on conflict (appointment_id, kind) do nothing;
  end if;

  if settings_row.reminder_24h_enabled
    and appointment_row.starts_at - interval '24 hours' > now() then
    insert into public.appointment_reminders (
      organization_id, appointment_id, kind, channel, scheduled_at,
      next_attempt_at, status, max_attempts, idempotency_key,
      last_error_code
    ) values (
      appointment_row.organization_id, appointment_row.id, 'reminder_24h',
      settings_row.preferred_channel,
      appointment_row.starts_at - interval '24 hours',
      appointment_row.starts_at - interval '24 hours',
      case when has_contact then 'queued'::public.reminder_status
        else 'blocked'::public.reminder_status end,
      settings_row.max_attempts,
      appointment_row.id::text || ':reminder_24h',
      case when has_contact then null else 'missing_contact' end
    ) on conflict (appointment_id, kind) do nothing;
  end if;

  if settings_row.reminder_2h_enabled
    and appointment_row.starts_at - interval '2 hours' > now() then
    insert into public.appointment_reminders (
      organization_id, appointment_id, kind, channel, scheduled_at,
      next_attempt_at, status, max_attempts, idempotency_key,
      last_error_code
    ) values (
      appointment_row.organization_id, appointment_row.id, 'reminder_2h',
      settings_row.preferred_channel,
      appointment_row.starts_at - interval '2 hours',
      appointment_row.starts_at - interval '2 hours',
      case when has_contact then 'queued'::public.reminder_status
        else 'blocked'::public.reminder_status end,
      settings_row.max_attempts,
      appointment_row.id::text || ':reminder_2h',
      case when has_contact then null else 'missing_contact' end
    ) on conflict (appointment_id, kind) do nothing;
  end if;
end;
$$;

revoke all on function private.schedule_appointment_reminders(uuid,boolean) from public;

create function private.sync_appointment_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.schedule_appointment_reminders(new.id, true);
  elsif new.status in ('completed','no_show','cancelled','rescheduled')
    and new.status is distinct from old.status then
    update public.appointment_reminders set
      status = 'cancelled', locked_at = null, locked_by = null,
      last_error_code = null
    where appointment_id = new.id
      and status in ('queued','processing','failed','blocked');
  end if;
  return new;
end;
$$;

create trigger appointments_sync_reminders
  after insert or update of status on public.appointments
  for each row execute procedure private.sync_appointment_reminders();

create function private.create_default_reminder_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.reminder_settings (organization_id)
  values (new.id) on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger organizations_create_reminder_settings
  after insert on public.organizations
  for each row execute procedure private.create_default_reminder_settings();

insert into public.reminder_settings (organization_id)
select id from public.organizations where deleted_at is null
on conflict (organization_id) do nothing;

do $$
declare appointment_row public.appointments;
begin
  for appointment_row in
    select * from public.appointments
    where starts_at > now()
      and status not in ('completed','no_show','cancelled','rescheduled')
  loop
    perform private.schedule_appointment_reminders(appointment_row.id, false);
  end loop;
end;
$$;

alter table public.reminder_settings enable row level security;
alter table public.appointment_reminders enable row level security;
alter table public.reminder_delivery_attempts enable row level security;
revoke all on table public.reminder_settings from anon, authenticated;
revoke all on table public.appointment_reminders from anon, authenticated;
revoke all on table public.reminder_delivery_attempts from anon, authenticated;
grant select on table public.reminder_settings to authenticated;
grant select on table public.appointment_reminders to authenticated;
grant select on table public.reminder_delivery_attempts to authenticated;
grant select on table public.reminder_settings to service_role;
grant select on table public.appointment_reminders to service_role;
grant select on table public.reminder_delivery_attempts to service_role;

create policy reminder_settings_select_staff
  on public.reminder_settings for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner','nutritionist','assistant']::public.app_role[]
  )));
create policy appointment_reminders_select_staff
  on public.appointment_reminders for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner','nutritionist','assistant']::public.app_role[]
  )));
create policy reminder_delivery_attempts_select_staff
  on public.reminder_delivery_attempts for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner','nutritionist','assistant']::public.app_role[]
  )));

create function public.save_reminder_settings(
  target_organization_id uuid,
  reminder_channel public.reminder_channel,
  enable_confirmation boolean,
  enable_24h boolean,
  enable_2h boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare appointment_row public.appointments;
begin
  if not (select private.has_organization_role(
    target_organization_id,
    array['owner','nutritionist']::public.app_role[]
  )) then raise exception 'Reminder configuration role required'; end if;

  update public.reminder_settings set
    preferred_channel = reminder_channel,
    confirmation_enabled = enable_confirmation,
    reminder_24h_enabled = enable_24h,
    reminder_2h_enabled = enable_2h
  where organization_id = target_organization_id;
  if not found then raise exception 'Reminder settings not found'; end if;

  update public.appointment_reminders set status = 'cancelled'
  where organization_id = target_organization_id
    and status in ('queued','blocked','failed')
    and kind = 'confirmation' and not enable_confirmation;

  update public.appointment_reminders as reminder set
    channel = reminder_channel,
    status = case
      when (reminder.kind = 'reminder_24h' and not enable_24h)
        or (reminder.kind = 'reminder_2h' and not enable_2h)
        then 'cancelled'::public.reminder_status
      when (select private.patient_has_reminder_contact(
        appointment.patient_id, reminder_channel
      )) then 'queued'::public.reminder_status
      else 'blocked'::public.reminder_status
    end,
    last_error_code = case
      when (reminder.kind = 'reminder_24h' and not enable_24h)
        or (reminder.kind = 'reminder_2h' and not enable_2h) then null
      when (select private.patient_has_reminder_contact(
        appointment.patient_id, reminder_channel
      )) then null
      else 'missing_contact'
    end,
    next_attempt_at = reminder.scheduled_at,
    attempt_count = 0
  from public.appointments as appointment
  where appointment.id = reminder.appointment_id
    and reminder.organization_id = target_organization_id
    and reminder.kind in ('reminder_24h','reminder_2h')
    and reminder.scheduled_at > now()
    and reminder.status in ('queued','blocked','failed','cancelled');

  for appointment_row in
    select * from public.appointments
    where organization_id = target_organization_id
      and starts_at > now()
      and status not in ('completed','no_show','cancelled','rescheduled')
  loop
    perform private.schedule_appointment_reminders(appointment_row.id, false);
  end loop;

  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id
  ) values (
    target_organization_id, (select auth.uid()), 'update',
    'reminder_settings', target_organization_id
  );
end;
$$;

create function public.claim_due_appointment_reminders(
  batch_size integer,
  worker_id text
)
returns setof public.appointment_reminders
language plpgsql
security definer
set search_path = ''
as $$
begin
  if batch_size not between 1 and 100
    or char_length(trim(worker_id)) not between 1 and 120 then
    raise exception 'Invalid reminder claim';
  end if;
  return query
  with due as (
    select reminder.id
    from public.appointment_reminders as reminder
    join public.appointments as appointment on appointment.id = reminder.appointment_id
    where (
        reminder.status = 'queued'
        or (
          reminder.status = 'processing'
          and reminder.locked_at < now() - interval '10 minutes'
        )
      )
      and reminder.next_attempt_at <= now()
      and reminder.attempt_count < reminder.max_attempts
      and appointment.status in ('pending','confirmed')
    order by reminder.next_attempt_at, reminder.created_at
    for update of reminder skip locked
    limit batch_size
  )
  update public.appointment_reminders as reminder set
    status = 'processing',
    attempt_count = reminder.attempt_count + 1,
    locked_at = now(),
    locked_by = trim(worker_id),
    last_error_code = null
  from due where reminder.id = due.id
  returning reminder.*;
end;
$$;

create function public.complete_appointment_reminder(
  target_reminder_id uuid,
  worker_id text,
  delivery_outcome public.reminder_attempt_outcome,
  provider_name text,
  external_message_id text,
  normalized_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare reminder_row public.appointment_reminders;
begin
  select * into reminder_row from public.appointment_reminders
  where id = target_reminder_id for update;
  if reminder_row.id is null
    or reminder_row.status <> 'processing'
    or reminder_row.locked_by is distinct from trim(worker_id) then
    raise exception 'Reminder lease not found';
  end if;
  if char_length(trim(provider_name)) not between 2 and 80 then
    raise exception 'Invalid provider';
  end if;
  if delivery_outcome = 'sent' and external_message_id is null then
    raise exception 'Provider message ID required';
  end if;
  if delivery_outcome = 'failed'
    and coalesce(normalized_error_code, '') !~ '^[a-z0-9_]{2,80}$' then
    raise exception 'Normalized error code required';
  end if;

  insert into public.reminder_delivery_attempts (
    organization_id, reminder_id, attempt_number, outcome, provider,
    provider_message_id, error_code
  ) values (
    reminder_row.organization_id, reminder_row.id,
    reminder_row.attempt_count, delivery_outcome, trim(provider_name),
    case when delivery_outcome = 'sent' then external_message_id else null end,
    case when delivery_outcome = 'failed' then normalized_error_code else null end
  );

  if delivery_outcome = 'sent' then
    update public.appointment_reminders set
      status = 'sent', sent_at = now(), provider_message_id = external_message_id,
      last_error_code = null, locked_at = null, locked_by = null
    where id = reminder_row.id;
  elsif reminder_row.attempt_count >= reminder_row.max_attempts then
    update public.appointment_reminders set
      status = 'failed', last_error_code = normalized_error_code,
      locked_at = null, locked_by = null
    where id = reminder_row.id;
  else
    update public.appointment_reminders set
      status = 'queued', last_error_code = normalized_error_code,
      next_attempt_at = now() + make_interval(mins => 15 * reminder_row.attempt_count),
      locked_at = null, locked_by = null
    where id = reminder_row.id;
  end if;
end;
$$;

revoke all on function public.save_reminder_settings(uuid,public.reminder_channel,boolean,boolean,boolean) from public;
revoke all on function public.claim_due_appointment_reminders(integer,text) from public;
revoke all on function public.complete_appointment_reminder(uuid,text,public.reminder_attempt_outcome,text,text,text) from public;
grant execute on function public.save_reminder_settings(uuid,public.reminder_channel,boolean,boolean,boolean) to authenticated;
grant execute on function public.claim_due_appointment_reminders(integer,text) to service_role;
grant execute on function public.complete_appointment_reminder(uuid,text,public.reminder_attempt_outcome,text,text,text) to service_role;
