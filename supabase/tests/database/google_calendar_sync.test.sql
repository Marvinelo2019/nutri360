begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

select has_table('public','google_calendar_connections','Google Calendar connections exist');
select has_table('public','google_calendar_oauth_states','one-time OAuth states exist');
select has_table('public','calendar_sync_jobs','calendar outbox exists');
select has_table('public','appointment_calendar_events','appointment event mappings exist');
select has_table('public','google_calendar_busy_periods','free/busy snapshots exist');
select ok((
  select bool_and(relrowsecurity) from pg_class
  where oid in (
    'public.google_calendar_connections'::regclass,
    'public.google_calendar_oauth_states'::regclass,
    'public.calendar_sync_jobs'::regclass,
    'public.appointment_calendar_events'::regclass,
    'public.google_calendar_busy_periods'::regclass
  )
),'all calendar integration tables have RLS');
select ok(not has_table_privilege('authenticated','public.google_calendar_connections','SELECT'),'browser roles cannot read encrypted credentials');
select ok(not has_table_privilege('authenticated','public.calendar_sync_jobs','SELECT'),'browser roles cannot inspect worker jobs');
select ok(not has_function_privilege('authenticated','public.complete_google_calendar_connection(text,uuid,text,text,text,text[])','EXECUTE'),'browser roles cannot store OAuth credentials');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('1e000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','calendar-owner@test.local','',now(),'{}','{}',now(),now()),
('1e000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','calendar-assistant@test.local','',now(),'{}','{}',now(),now()),
('1e000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','calendar-outsider@test.local','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug,created_by)
values ('2e000000-0000-0000-0000-000000000001','Calendar Clinic','calendar-clinic','1e000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('2e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001','owner','active'),
('2e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000002','assistant','active');
insert into public.patients (id,organization_id,first_name,last_name,birth_date,created_by)
values ('3e000000-0000-0000-0000-000000000001','2e000000-0000-0000-0000-000000000001','Synthetic','Calendar','1990-01-01','1e000000-0000-0000-0000-000000000001');
insert into public.appointments (
  id,organization_id,patient_id,professional_user_id,starts_at,ends_at,
  modality,status,created_by
) values (
  '4e000000-0000-0000-0000-000000000001','2e000000-0000-0000-0000-000000000001',
  '3e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001',
  now()+interval '7 days',now()+interval '7 days 1 hour','in_person','confirmed',
  '1e000000-0000-0000-0000-000000000001'
);

set local role authenticated;
set local request.jwt.claim.sub='1e000000-0000-0000-0000-000000000001';
select results_eq(
  $$select count(*) from public.get_google_calendar_connection_status('2e000000-0000-0000-0000-000000000001')$$,
  array[0::bigint],'owner initially has no connection'
);

set local role service_role;
select throws_ok(
  $$select public.create_google_calendar_oauth_state('2e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000002',repeat('b',64))$$,
  'P0001','Calendar connection role required','assistant cannot receive a calendar OAuth state'
);
select lives_ok(
  $$select public.create_google_calendar_oauth_state('2e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001',repeat('a',64))$$,
  'service creates a short-lived state for a professional'
);
select throws_ok(
  $$select public.complete_google_calendar_connection(repeat('a',64),'1e000000-0000-0000-0000-000000000001',repeat('c',40),repeat('d',16),repeat('e',16),array['https://www.googleapis.com/auth/calendar.events.owned'])$$,
  'P0001','Required Calendar scopes missing','connection requires both narrow scopes'
);
select lives_ok(
  $$select public.complete_google_calendar_connection(repeat('a',64),'1e000000-0000-0000-0000-000000000001',repeat('c',40),repeat('d',16),repeat('e',16),array['https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/calendar.freebusy'])$$,
  'valid OAuth completion stores the encrypted credential'
);
select throws_ok(
  $$select public.complete_google_calendar_connection(repeat('a',64),'1e000000-0000-0000-0000-000000000001',repeat('c',40),repeat('d',16),repeat('e',16),array['https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/calendar.freebusy'])$$,
  'P0001','OAuth state unavailable','OAuth state cannot be replayed'
);
select results_eq($$select count(*) from public.calendar_sync_jobs$$,array[1::bigint],'connecting backfills the future appointment');

set local role authenticated;
set local request.jwt.claim.sub='1e000000-0000-0000-0000-000000000001';
select results_eq(
  $$select connection_status::text||'|'||pending_job_count from public.get_google_calendar_connection_status('2e000000-0000-0000-0000-000000000001')$$,
  array['active|1'::text],'owner reads only a non-secret connection summary'
);
set local request.jwt.claim.sub='1e000000-0000-0000-0000-000000000002';
select results_eq(
  $$select count(*) from public.get_google_calendar_connection_status('2e000000-0000-0000-0000-000000000001')$$,
  array[0::bigint],'assistant cannot read connection status'
);
set local request.jwt.claim.sub='1e000000-0000-0000-0000-000000000003';
select results_eq(
  $$select count(*) from public.get_google_calendar_connection_status('2e000000-0000-0000-0000-000000000001')$$,
  array[0::bigint],'cross-organization user cannot read connection status'
);

set local role service_role;
select results_eq(
  $$select count(*) from public.claim_calendar_sync_jobs(5,'calendar-test-worker')$$,
  array[1::bigint],'worker atomically claims one due job'
);
select lives_ok(
  $$select public.complete_calendar_sync_job(
    (select id from public.calendar_sync_jobs where appointment_id='4e000000-0000-0000-0000-000000000001'),
    'calendar-test-worker','n360abcdef0123456789')$$,
  'worker completes an upsert job'
);
select results_eq($$select count(*) from public.appointment_calendar_events$$,array[1::bigint],'successful upsert stores one mapping');

reset role;
update public.appointments set status='cancelled'
where id='4e000000-0000-0000-0000-000000000001';
select results_eq(
  $$select operation::text||'|'||status::text from public.calendar_sync_jobs where appointment_id='4e000000-0000-0000-0000-000000000001'$$,
  array['delete|queued'::text],'Nutri360 cancellation queues a Google deletion'
);
set local role service_role;
select lives_ok($$select public.claim_calendar_sync_jobs(5,'calendar-test-worker')$$,'worker reclaims the desired deletion');
select lives_ok(
  $$select public.complete_calendar_sync_job(
    (select id from public.calendar_sync_jobs where appointment_id='4e000000-0000-0000-0000-000000000001'),
    'calendar-test-worker','n360abcdef0123456789')$$,
  'worker completes the deletion idempotently'
);
select results_eq($$select count(*) from public.appointment_calendar_events$$,array[0::bigint],'successful deletion removes the mapping');

select lives_ok(
  $$select public.replace_google_calendar_busy_periods(
    (select id from public.google_calendar_connections),
    array[((current_date+1)::timestamp+time '09:00') at time zone 'America/Guatemala'],
    array[((current_date+1)::timestamp+time '10:00') at time zone 'America/Guatemala'])$$,
  'worker stores free/busy timestamps without event content'
);
set local role authenticated;
set local request.jwt.claim.sub='1e000000-0000-0000-0000-000000000001';
select throws_ok(
  $$select public.create_appointment(
    '3e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001',
    (current_date+1)::timestamp+time '09:00',60,'in_person')$$,
  'P0001','Professional is busy in connected calendar','fresh Google busy time blocks internal scheduling'
);
reset role;
update public.google_calendar_connections set last_busy_sync_at=now()-interval '16 minutes';
set local role authenticated;
set local request.jwt.claim.sub='1e000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.create_appointment(
    '3e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001',
    (current_date+1)::timestamp+time '09:00',60,'in_person')$$,
  'stale Google snapshot does not create a false scheduling lock'
);

set local role service_role;
select lives_ok(
  $$select public.disconnect_google_calendar('2e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001')$$,
  'professional disconnects the integration'
);
select results_eq($$select count(*) from public.google_calendar_connections$$,array[0::bigint],'disconnect removes encrypted credentials');
select results_eq($$select count(*) from public.calendar_sync_jobs$$,array[0::bigint],'disconnect removes pending worker jobs');
reset role;
insert into public.appointments (
  id,organization_id,patient_id,professional_user_id,starts_at,ends_at,
  modality,status,created_by
) values (
  '4e000000-0000-0000-0000-000000000003','2e000000-0000-0000-0000-000000000001',
  '3e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001',
  now()+interval '9 days',now()+interval '9 days 1 hour','in_person','cancelled',
  '1e000000-0000-0000-0000-000000000001'
);
insert into public.appointment_calendar_events (
  appointment_id,organization_id,professional_user_id,google_event_id
) values (
  '4e000000-0000-0000-0000-000000000003','2e000000-0000-0000-0000-000000000001',
  '1e000000-0000-0000-0000-000000000001','n360fedcba9876543210'
);
set local role service_role;
select lives_ok(
  $$select public.create_google_calendar_oauth_state('2e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001',repeat('f',64))$$,
  'professional can start a later reconnection'
);
select lives_ok(
  $$select public.complete_google_calendar_connection(repeat('f',64),'1e000000-0000-0000-0000-000000000001',repeat('c',40),repeat('d',16),repeat('e',16),array['https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/calendar.freebusy'])$$,
  'professional reconnects after an offline cancellation'
);
select results_eq(
  $$select operation::text from public.calendar_sync_jobs where appointment_id='4e000000-0000-0000-0000-000000000003'$$,
  array['delete'::text],'reconnection queues deletion of a previously mapped cancellation'
);
select lives_ok(
  $$select public.disconnect_google_calendar('2e000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001')$$,
  'professional can disconnect after reconciliation is queued'
);
reset role;
select cmp_ok(
  (select count(*) from public.audit_events where organization_id='2e000000-0000-0000-0000-000000000001' and entity_type='google_calendar_connections'),
  '=',4::bigint,'connect and disconnect are audited without secrets'
);

select * from finish();
rollback;
