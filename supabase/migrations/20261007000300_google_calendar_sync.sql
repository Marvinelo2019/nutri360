-- Privacy-preserving Google Calendar synchronization and free/busy snapshots.

create type public.calendar_connection_status as enum (
  'active', 'reauthorization_required', 'error'
);
create type public.calendar_sync_operation as enum ('upsert', 'delete');
create type public.calendar_sync_status as enum (
  'queued', 'processing', 'succeeded', 'failed'
);

create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  professional_user_id uuid not null references auth.users (id) on delete cascade,
  calendar_id text not null default 'primary' check (calendar_id = 'primary'),
  refresh_token_ciphertext text not null check (char_length(refresh_token_ciphertext) between 20 and 4096),
  refresh_token_iv text not null check (char_length(refresh_token_iv) between 12 and 128),
  refresh_token_auth_tag text not null check (char_length(refresh_token_auth_tag) between 12 and 128),
  token_key_version smallint not null default 1 check (token_key_version between 1 and 100),
  granted_scopes text[] not null,
  status public.calendar_connection_status not null default 'active',
  last_error_code text check (last_error_code is null or last_error_code ~ '^[a-z0-9_]{2,80}$'),
  last_event_sync_at timestamptz,
  last_busy_sync_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, professional_user_id),
  check (cardinality(granted_scopes) between 1 and 10)
);

create table public.google_calendar_oauth_states (
  state_hash text primary key check (state_hash ~ '^[0-9a-f]{64}$'),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  professional_user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '15 minutes'),
  check (consumed_at is null or consumed_at >= created_at)
);
create index google_calendar_oauth_states_expiry_idx
  on public.google_calendar_oauth_states (expires_at) where consumed_at is null;

create table public.appointment_calendar_events (
  appointment_id uuid primary key,
  organization_id uuid not null,
  professional_user_id uuid not null references auth.users (id) on delete restrict,
  google_event_id text not null check (
    char_length(google_event_id) between 5 and 1024
    and google_event_id ~ '^[0-9a-v]+$'
  ),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (appointment_id, organization_id)
    references public.appointments (id, organization_id) on delete cascade,
  unique (organization_id, professional_user_id, google_event_id)
);

create table public.calendar_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.google_calendar_connections (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  appointment_id uuid not null,
  professional_user_id uuid not null references auth.users (id) on delete cascade,
  operation public.calendar_sync_operation not null,
  status public.calendar_sync_status not null default 'queued',
  attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
  max_attempts smallint not null default 5 check (max_attempts between 1 and 5),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text check (locked_by is null or char_length(locked_by) between 1 and 120),
  last_error_code text check (last_error_code is null or last_error_code ~ '^[a-z0-9_]{2,80}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (appointment_id, organization_id)
    references public.appointments (id, organization_id) on delete cascade,
  unique (appointment_id),
  check (
    (status = 'processing' and locked_at is not null and locked_by is not null)
    or status <> 'processing'
  )
);
create index calendar_sync_jobs_due_idx
  on public.calendar_sync_jobs (next_attempt_at, created_at)
  where status in ('queued', 'processing');

create table public.google_calendar_busy_periods (
  id bigint generated always as identity primary key,
  connection_id uuid not null references public.google_calendar_connections (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  professional_user_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  refreshed_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '31 days')
);
create index google_calendar_busy_periods_lookup_idx
  on public.google_calendar_busy_periods (
    organization_id, professional_user_id, starts_at, ends_at
  );

create trigger google_calendar_connections_set_updated_at
  before update on public.google_calendar_connections
  for each row execute procedure private.set_updated_at();
create trigger calendar_sync_jobs_set_updated_at
  before update on public.calendar_sync_jobs
  for each row execute procedure private.set_updated_at();

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_oauth_states enable row level security;
alter table public.appointment_calendar_events enable row level security;
alter table public.calendar_sync_jobs enable row level security;
alter table public.google_calendar_busy_periods enable row level security;
revoke all on table public.google_calendar_connections from anon, authenticated;
revoke all on table public.google_calendar_oauth_states from anon, authenticated;
revoke all on table public.appointment_calendar_events from anon, authenticated;
revoke all on table public.calendar_sync_jobs from anon, authenticated;
revoke all on table public.google_calendar_busy_periods from anon, authenticated;
grant select on table public.google_calendar_connections to service_role;
grant select on table public.google_calendar_oauth_states to service_role;
grant select on table public.appointment_calendar_events to service_role;
grant select on table public.calendar_sync_jobs to service_role;
grant select on table public.google_calendar_busy_periods to service_role;

create function private.enqueue_google_calendar_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_connection_id uuid;
declare desired_operation public.calendar_sync_operation;
begin
  if new.status in ('completed','no_show') then return new; end if;
  select connection.id into target_connection_id
  from public.google_calendar_connections as connection
  where connection.organization_id = new.organization_id
    and connection.professional_user_id = new.professional_user_id
    and connection.status = 'active';
  if target_connection_id is null then return new; end if;
  desired_operation := case when new.status in ('cancelled','rescheduled')
    then 'delete'::public.calendar_sync_operation
    else 'upsert'::public.calendar_sync_operation end;
  insert into public.calendar_sync_jobs (
    connection_id,organization_id,appointment_id,professional_user_id,
    operation,status,attempt_count,next_attempt_at,locked_at,locked_by,last_error_code
  ) values (
    target_connection_id,new.organization_id,new.id,new.professional_user_id,
    desired_operation,'queued',0,now(),null,null,null
  ) on conflict (appointment_id) do update set
    connection_id=excluded.connection_id,
    operation=excluded.operation,status='queued',attempt_count=0,
    next_attempt_at=now(),locked_at=null,locked_by=null,last_error_code=null;
  return new;
end;
$$;
create trigger appointments_enqueue_google_calendar_sync
  after insert or update of status on public.appointments
  for each row execute procedure private.enqueue_google_calendar_sync();

create function private.prevent_google_calendar_busy_overlap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status not in ('cancelled','rescheduled') and exists (
    select 1
    from public.google_calendar_connections as connection
    join public.google_calendar_busy_periods as busy
      on busy.connection_id = connection.id
    where connection.organization_id = new.organization_id
      and connection.professional_user_id = new.professional_user_id
      and connection.status = 'active'
      and connection.last_busy_sync_at >= now() - interval '15 minutes'
      and tstzrange(busy.starts_at,busy.ends_at,'[)')
        && tstzrange(new.starts_at,new.ends_at,'[)')
  ) then raise exception 'Professional is busy in connected calendar'; end if;
  return new;
end;
$$;
create trigger appointments_google_calendar_busy_guard
  before insert on public.appointments
  for each row execute procedure private.prevent_google_calendar_busy_overlap();

create function public.get_google_calendar_connection_status(
  target_organization_id uuid
)
returns table (
  connection_status public.calendar_connection_status,
  last_error_code text,
  connected_at timestamptz,
  last_event_sync_at timestamptz,
  last_busy_sync_at timestamptz,
  pending_job_count bigint
)
language sql security definer set search_path = '' stable as $$
  select connection.status,connection.last_error_code,connection.connected_at,
    connection.last_event_sync_at,connection.last_busy_sync_at,
    count(job.id) filter (where job.status in ('queued','processing','failed'))
  from public.google_calendar_connections as connection
  left join public.calendar_sync_jobs as job on job.connection_id=connection.id
  where connection.organization_id=target_organization_id
    and connection.professional_user_id=(select auth.uid())
    and (select private.has_organization_role(
      target_organization_id,array['owner','nutritionist']::public.app_role[]
    ))
  group by connection.id;
$$;

create function public.create_google_calendar_oauth_state(
  target_organization_id uuid,
  target_professional_user_id uuid,
  oauth_state_hash text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if oauth_state_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid OAuth state'; end if;
  if not exists (
    select 1 from public.organization_memberships
    where organization_id=target_organization_id
      and user_id=target_professional_user_id and status='active'
      and role in ('owner','nutritionist')
  ) then raise exception 'Calendar connection role required'; end if;
  delete from public.google_calendar_oauth_states
    where expires_at < now() or professional_user_id=target_professional_user_id;
  insert into public.google_calendar_oauth_states (
    state_hash,organization_id,professional_user_id,expires_at
  ) values (oauth_state_hash,target_organization_id,target_professional_user_id,now()+interval '10 minutes');
end;
$$;

create function public.complete_google_calendar_connection(
  oauth_state_hash text,
  target_professional_user_id uuid,
  encrypted_refresh_token text,
  refresh_token_iv text,
  refresh_token_auth_tag text,
  granted_scopes text[]
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare state_row public.google_calendar_oauth_states;
declare created_connection_id uuid;
begin
  select * into state_row from public.google_calendar_oauth_states
  where state_hash=oauth_state_hash and professional_user_id=target_professional_user_id
    and consumed_at is null and expires_at>now() for update;
  if state_row.state_hash is null then raise exception 'OAuth state unavailable'; end if;
  if not exists (
    select 1 from public.organization_memberships
    where organization_id=state_row.organization_id
      and user_id=target_professional_user_id and status='active'
      and role in ('owner','nutritionist')
  ) then raise exception 'Calendar connection role required'; end if;
  if not (
    'https://www.googleapis.com/auth/calendar.events.owned'=any(granted_scopes)
    and 'https://www.googleapis.com/auth/calendar.freebusy'=any(granted_scopes)
  ) then raise exception 'Required Calendar scopes missing'; end if;
  insert into public.google_calendar_connections (
    organization_id,professional_user_id,refresh_token_ciphertext,
    refresh_token_iv,refresh_token_auth_tag,granted_scopes,status,last_error_code
  ) values (
    state_row.organization_id,target_professional_user_id,encrypted_refresh_token,
    refresh_token_iv,refresh_token_auth_tag,granted_scopes,'active',null
  ) on conflict (organization_id,professional_user_id) do update set
    refresh_token_ciphertext=excluded.refresh_token_ciphertext,
    refresh_token_iv=excluded.refresh_token_iv,
    refresh_token_auth_tag=excluded.refresh_token_auth_tag,
    granted_scopes=excluded.granted_scopes,status='active',last_error_code=null,
    connected_at=now()
  returning id into created_connection_id;
  update public.google_calendar_oauth_states set consumed_at=now()
    where state_hash=state_row.state_hash;
  insert into public.calendar_sync_jobs (
    connection_id,organization_id,appointment_id,professional_user_id,operation
  ) select created_connection_id,appointment.organization_id,appointment.id,
      appointment.professional_user_id,
      case when appointment.status in ('cancelled','rescheduled')
        then 'delete'::public.calendar_sync_operation
        else 'upsert'::public.calendar_sync_operation end
    from public.appointments as appointment
    where appointment.organization_id=state_row.organization_id
      and appointment.professional_user_id=target_professional_user_id
      and (
        (appointment.ends_at>now() and appointment.status in ('pending','confirmed'))
        or (
          appointment.status in ('cancelled','rescheduled')
          and exists (
            select 1 from public.appointment_calendar_events as mapping
            where mapping.appointment_id=appointment.id
          )
        )
      )
  on conflict (appointment_id) do update set
    connection_id=excluded.connection_id,operation='upsert',status='queued',
    attempt_count=0,next_attempt_at=now(),locked_at=null,locked_by=null,
    last_error_code=null;
  insert into public.audit_events (
    organization_id,actor_user_id,action,entity_type,entity_id
  ) values (
    state_row.organization_id,target_professional_user_id,'connect',
    'google_calendar_connections',created_connection_id
  );
  return created_connection_id;
end;
$$;

create function public.queue_google_calendar_sync(target_organization_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare connection_row public.google_calendar_connections;
begin
  if not (select private.has_organization_role(
    target_organization_id,array['owner','nutritionist']::public.app_role[]
  )) then raise exception 'Calendar connection role required'; end if;
  select * into connection_row from public.google_calendar_connections
  where organization_id=target_organization_id
    and professional_user_id=(select auth.uid()) and status='active';
  if connection_row.id is null then raise exception 'Calendar connection not found'; end if;
  insert into public.calendar_sync_jobs (
    connection_id,organization_id,appointment_id,professional_user_id,operation
  ) select connection_row.id,appointment.organization_id,appointment.id,
      appointment.professional_user_id,
      case when appointment.status in ('cancelled','rescheduled')
        then 'delete'::public.calendar_sync_operation
        else 'upsert'::public.calendar_sync_operation end
    from public.appointments as appointment
    where appointment.organization_id=target_organization_id
      and appointment.professional_user_id=(select auth.uid())
      and appointment.ends_at>now()-interval '1 day'
      and appointment.status not in ('completed','no_show')
  on conflict (appointment_id) do update set
    connection_id=excluded.connection_id,operation=excluded.operation,
    status='queued',attempt_count=0,next_attempt_at=now(),
    locked_at=null,locked_by=null,last_error_code=null;
end;
$$;

create function public.claim_calendar_sync_jobs(
  batch_size integer,worker_id text,target_connection_id uuid default null
)
returns setof public.calendar_sync_jobs
language plpgsql security definer set search_path = '' as $$
begin
  if batch_size not between 1 and 50
    or char_length(trim(worker_id)) not between 1 and 120 then
    raise exception 'Invalid calendar sync claim';
  end if;
  return query with due as (
    select job.id from public.calendar_sync_jobs as job
    join public.google_calendar_connections as connection on connection.id=job.connection_id
    where connection.status='active' and job.attempt_count<job.max_attempts
      and (target_connection_id is null or job.connection_id=target_connection_id)
      and job.next_attempt_at<=now()
      and (job.status='queued' or (
        job.status='processing' and job.locked_at<now()-interval '10 minutes'
      ))
    order by job.next_attempt_at,job.created_at
    for update of job skip locked limit batch_size
  ) update public.calendar_sync_jobs as job set
    status='processing',attempt_count=job.attempt_count+1,
    locked_at=now(),locked_by=trim(worker_id),last_error_code=null
  from due where job.id=due.id returning job.*;
end;
$$;

create function public.record_google_calendar_connection_error(
  target_connection_id uuid,normalized_error_code text,
  requires_reauthorization boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if normalized_error_code !~ '^[a-z0-9_]{2,80}$' then raise exception 'Invalid error code'; end if;
  update public.google_calendar_connections set
    status=case when requires_reauthorization
      then 'reauthorization_required'::public.calendar_connection_status else 'active'::public.calendar_connection_status end,
    last_error_code=normalized_error_code
  where id=target_connection_id;
  if not found then raise exception 'Calendar connection not found'; end if;
end;
$$;

create function public.complete_calendar_sync_job(
  target_job_id uuid,worker_id text,google_event_id text
)
returns void language plpgsql security definer set search_path = '' as $$
declare job_row public.calendar_sync_jobs;
begin
  select * into job_row from public.calendar_sync_jobs
    where id=target_job_id for update;
  if job_row.id is null or job_row.status<>'processing'
    or job_row.locked_by is distinct from trim(worker_id) then
    raise exception 'Calendar sync lease not found';
  end if;
  if char_length(google_event_id) not between 5 and 1024
    or google_event_id !~ '^[0-9a-v]+$' then
    raise exception 'Invalid Google event ID';
  end if;
  if job_row.operation='upsert' then
    insert into public.appointment_calendar_events (
      appointment_id,organization_id,professional_user_id,google_event_id,last_synced_at
    ) values (
      job_row.appointment_id,job_row.organization_id,
      job_row.professional_user_id,google_event_id,now()
    ) on conflict (appointment_id) do update set
      google_event_id=excluded.google_event_id,last_synced_at=now();
  else
    delete from public.appointment_calendar_events where appointment_id=job_row.appointment_id;
  end if;
  update public.calendar_sync_jobs set status='succeeded',locked_at=null,
    locked_by=null,last_error_code=null where id=job_row.id;
  update public.google_calendar_connections set last_event_sync_at=now(),
    last_error_code=null where id=job_row.connection_id;
end;
$$;

create function public.fail_calendar_sync_job(
  target_job_id uuid,worker_id text,normalized_error_code text,
  requires_reauthorization boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare job_row public.calendar_sync_jobs;
begin
  if normalized_error_code !~ '^[a-z0-9_]{2,80}$' then raise exception 'Invalid error code'; end if;
  select * into job_row from public.calendar_sync_jobs
    where id=target_job_id for update;
  if job_row.id is null or job_row.status<>'processing'
    or job_row.locked_by is distinct from trim(worker_id) then
    raise exception 'Calendar sync lease not found';
  end if;
  update public.calendar_sync_jobs set
    status=case when job_row.attempt_count>=job_row.max_attempts
      then 'failed'::public.calendar_sync_status else 'queued'::public.calendar_sync_status end,
    next_attempt_at=now()+make_interval(mins=>least(60,5*job_row.attempt_count)),
    locked_at=null,locked_by=null,last_error_code=normalized_error_code
  where id=job_row.id;
  update public.google_calendar_connections set
    status=case when requires_reauthorization
      then 'reauthorization_required'::public.calendar_connection_status else status end,
    last_error_code=normalized_error_code where id=job_row.connection_id;
end;
$$;

create function public.replace_google_calendar_busy_periods(
  target_connection_id uuid,
  period_starts timestamptz[],
  period_ends timestamptz[]
)
returns void language plpgsql security definer set search_path = '' as $$
declare connection_row public.google_calendar_connections;
begin
  select * into connection_row from public.google_calendar_connections
    where id=target_connection_id and status='active' for update;
  if connection_row.id is null then raise exception 'Calendar connection not found'; end if;
  if cardinality(period_starts) is distinct from cardinality(period_ends)
    or coalesce(cardinality(period_starts),0)>500 then raise exception 'Invalid busy periods'; end if;
  if exists (
    select 1 from unnest(period_starts,period_ends) as period(starts_at,ends_at)
    where period.starts_at is null or period.ends_at is null
      or period.ends_at<=period.starts_at
      or period.ends_at>period.starts_at+interval '31 days'
  ) then raise exception 'Invalid busy period'; end if;
  delete from public.google_calendar_busy_periods where connection_id=target_connection_id;
  insert into public.google_calendar_busy_periods (
    connection_id,organization_id,professional_user_id,starts_at,ends_at,refreshed_at
  ) select connection_row.id,connection_row.organization_id,
    connection_row.professional_user_id,period.starts_at,period.ends_at,now()
  from unnest(period_starts,period_ends) as period(starts_at,ends_at);
  update public.google_calendar_connections set
    last_busy_sync_at=now(),last_error_code=null where id=target_connection_id;
end;
$$;

create function public.disconnect_google_calendar(
  target_organization_id uuid,target_professional_user_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare connection_id uuid;
begin
  if not exists (
    select 1 from public.organization_memberships
    where organization_id=target_organization_id
      and user_id=target_professional_user_id and status='active'
      and role in ('owner','nutritionist')
  ) then raise exception 'Calendar connection role required'; end if;
  select id into connection_id from public.google_calendar_connections
    where organization_id=target_organization_id
      and professional_user_id=target_professional_user_id;
  if connection_id is null then return; end if;
  delete from public.google_calendar_connections where id=connection_id;
  insert into public.audit_events (
    organization_id,actor_user_id,action,entity_type,entity_id
  ) values (
    target_organization_id,target_professional_user_id,'disconnect',
    'google_calendar_connections',connection_id
  );
end;
$$;

create or replace function public.list_public_booking_slots(
  booking_slug text,target_start_date date,requested_days smallint default 7
)
returns table (
  professional_user_id uuid,professional_name text,
  starts_at timestamptz,ends_at timestamptz
)
language sql security definer set search_path = '' stable as $$
  with configuration as (
    select organization.id as organization_id,organization.timezone,
      settings.appointment_duration_minutes as duration_minutes,
      settings.minimum_notice_hours,settings.booking_horizon_days,
      (now() at time zone organization.timezone)::date as clinic_today
    from public.organizations as organization
    join public.public_booking_settings as settings on settings.organization_id=organization.id
    where organization.slug=booking_slug and organization.deleted_at is null
      and settings.is_enabled and requested_days between 1 and 14
  ), dates as (
    select generated_date::date as local_date
    from configuration,generate_series(
      greatest(target_start_date,clinic_today)::timestamp,
      least(target_start_date+requested_days-1,clinic_today+booking_horizon_days)::timestamp,
      interval '1 day'
    ) as generated_date
  ), candidates as (
    select rule.organization_id,rule.professional_user_id,profile.full_name,
      (dates.local_date::timestamp+rule.starts_at_local
        +make_interval(mins=>slot_number*configuration.duration_minutes))
        at time zone configuration.timezone as slot_start,
      configuration.duration_minutes
    from configuration join dates on true
    join public.availability_rules as rule
      on rule.organization_id=configuration.organization_id
      and rule.day_of_week=extract(dow from dates.local_date)::smallint and rule.is_active
    join public.organization_memberships as membership
      on membership.organization_id=rule.organization_id
      and membership.user_id=rule.professional_user_id
      and membership.status='active' and membership.role in ('owner','nutritionist')
    join public.profiles as profile on profile.user_id=rule.professional_user_id
    cross join lateral generate_series(0,greatest(
      floor(extract(epoch from (rule.ends_at_local-rule.starts_at_local))/60
        /configuration.duration_minutes)::integer-1,-1
    )) as slot_number
    where (dates.local_date::timestamp+rule.starts_at_local
      +make_interval(mins=>slot_number*configuration.duration_minutes))
      at time zone configuration.timezone
      >=now()+make_interval(hours=>configuration.minimum_notice_hours)
  )
  select candidate.professional_user_id,candidate.full_name,candidate.slot_start,
    candidate.slot_start+make_interval(mins=>candidate.duration_minutes)
  from candidates as candidate where not exists (
    select 1 from public.availability_blocks as block
    where block.organization_id=candidate.organization_id
      and block.professional_user_id=candidate.professional_user_id
      and tstzrange(block.starts_at,block.ends_at,'[)') && tstzrange(
        candidate.slot_start,
        candidate.slot_start+make_interval(mins=>candidate.duration_minutes),'[)')
  ) and not exists (
    select 1 from public.appointments as appointment
    where appointment.organization_id=candidate.organization_id
      and appointment.professional_user_id=candidate.professional_user_id
      and appointment.status not in ('cancelled','rescheduled')
      and tstzrange(appointment.starts_at,appointment.ends_at,'[)') && tstzrange(
        candidate.slot_start,
        candidate.slot_start+make_interval(mins=>candidate.duration_minutes),'[)')
  ) and not exists (
    select 1 from public.google_calendar_busy_periods as busy
    join public.google_calendar_connections as connection on connection.id=busy.connection_id
    where busy.organization_id=candidate.organization_id
      and busy.professional_user_id=candidate.professional_user_id
      and connection.status='active'
      and connection.last_busy_sync_at>=now()-interval '15 minutes'
      and tstzrange(busy.starts_at,busy.ends_at,'[)') && tstzrange(
        candidate.slot_start,
        candidate.slot_start+make_interval(mins=>candidate.duration_minutes),'[)')
  ) order by candidate.slot_start,candidate.full_name;
$$;

revoke all on function public.get_google_calendar_connection_status(uuid) from public;
revoke all on function public.create_google_calendar_oauth_state(uuid,uuid,text) from public;
revoke all on function public.complete_google_calendar_connection(text,uuid,text,text,text,text[]) from public;
revoke all on function public.queue_google_calendar_sync(uuid) from public;
revoke all on function public.claim_calendar_sync_jobs(integer,text,uuid) from public;
revoke all on function public.complete_calendar_sync_job(uuid,text,text) from public;
revoke all on function public.fail_calendar_sync_job(uuid,text,text,boolean) from public;
revoke all on function public.replace_google_calendar_busy_periods(uuid,timestamptz[],timestamptz[]) from public;
revoke all on function public.disconnect_google_calendar(uuid,uuid) from public;
revoke all on function public.record_google_calendar_connection_error(uuid,text,boolean) from public;
grant execute on function public.get_google_calendar_connection_status(uuid) to authenticated;
grant execute on function public.queue_google_calendar_sync(uuid) to authenticated;
grant execute on function public.create_google_calendar_oauth_state(uuid,uuid,text) to service_role;
grant execute on function public.complete_google_calendar_connection(text,uuid,text,text,text,text[]) to service_role;
grant execute on function public.claim_calendar_sync_jobs(integer,text,uuid) to service_role;
grant execute on function public.complete_calendar_sync_job(uuid,text,text) to service_role;
grant execute on function public.fail_calendar_sync_job(uuid,text,text,boolean) to service_role;
grant execute on function public.replace_google_calendar_busy_periods(uuid,timestamptz[],timestamptz[]) to service_role;
grant execute on function public.disconnect_google_calendar(uuid,uuid) to service_role;
grant execute on function public.record_google_calendar_connection_error(uuid,text,boolean) to service_role;
