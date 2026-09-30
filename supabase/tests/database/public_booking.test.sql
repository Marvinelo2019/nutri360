begin;

create extension if not exists pgtap with schema extensions;
select plan(34);

select has_table('public', 'public_booking_settings', 'public booking settings table exists');
select has_table('public', 'availability_rules', 'availability rules table exists');
select has_table('public', 'availability_blocks', 'availability blocks table exists');
select has_table('public', 'public_booking_rate_limits', 'public booking rate-limit table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.public_booking_settings'::regclass), 'booking settings has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.availability_rules'::regclass), 'availability rules has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.availability_blocks'::regclass), 'availability blocks has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.public_booking_rate_limits'::regclass), 'rate limits has RLS');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('17000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','public-owner@test.local','',now(),'{}','{"full_name":"Public Owner"}',now(),now()),
('17000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','public-assistant@test.local','',now(),'{}','{"full_name":"Public Assistant"}',now(),now());

insert into public.organizations (id, name, slug, created_by)
values ('27000000-0000-0000-0000-000000000001','Public Clinic','public-clinic','17000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id, user_id, role, status)
values
('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','owner','active'),
('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000002','assistant','active');

select results_eq(
  $$select count(*) from public.public_booking_settings where organization_id='27000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'organization receives disabled default booking settings'
);

set local role authenticated;
set local request.jwt.claim.sub = '17000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.save_public_booking_settings('27000000-0000-0000-0000-000000000001',true,60::smallint,1::smallint,45::smallint,'in_person','Llegar 10 minutos antes')$$,
  'owner enables public booking'
);
select lives_ok(
  format(
    $$select public.create_availability_rule('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001',%s::smallint,'09:00'::time,'11:00'::time)$$,
    extract(dow from current_date + 7)::integer
  ),
  'owner creates professional availability'
);

set local request.jwt.claim.sub = '17000000-0000-0000-0000-000000000002';
select throws_ok(
  format(
    $$select public.create_availability_rule('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001',%s::smallint,'12:00'::time,'13:00'::time)$$,
    extract(dow from current_date + 7)::integer
  ),
  'P0001',
  'Booking configuration role required',
  'assistant cannot change public availability'
);

reset role;
set local role service_role;
select results_eq(
  $$select organization_name from public.get_public_booking_context('public-clinic')$$,
  array['Public Clinic'::text],
  'enabled link returns minimal public clinic context'
);
select results_eq(
  format($$select count(*) from public.list_public_booking_slots('public-clinic','%s',1::smallint)$$, current_date + 7),
  array[2::bigint],
  'recurring two-hour window produces two available slots'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '17000000-0000-0000-0000-000000000001';
select lives_ok(
  format(
    $$select public.create_availability_block('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','%s 09:00'::timestamp,'%s 10:00'::timestamp,'Reunión')$$,
    current_date + 7,
    current_date + 7
  ),
  'owner blocks one occurrence'
);

reset role;
set local role service_role;
select results_eq(
  format($$select count(*) from public.list_public_booking_slots('public-clinic','%s',1::smallint)$$, current_date + 7),
  array[1::bigint],
  'blocked occurrence is removed from public slots'
);
select results_eq(
  $$select count(*) from public.get_public_booking_context('missing-clinic')$$,
  array[0::bigint],
  'unknown link exposes no organization details'
);
select ok(
  not has_function_privilege('anon', 'public.get_public_booking_context(text)', 'EXECUTE'),
  'anonymous database role cannot call public context directly'
);
select ok(
  not has_function_privilege('authenticated', 'public.create_public_booking(text,uuid,timestamp with time zone,text,text,date,text,text)', 'EXECUTE'),
  'authenticated browser role cannot call public booking directly'
);
select ok(
  has_function_privilege('service_role', 'public.create_public_booking(text,uuid,timestamp with time zone,text,text,date,text,text)', 'EXECUTE'),
  'server service role can call controlled public booking operation'
);
select ok(public.consume_public_booking_rate_limit(repeat('a',64),'availability:public-clinic',2,300), 'first rate-limited request is allowed');
select ok(public.consume_public_booking_rate_limit(repeat('a',64),'availability:public-clinic',2,300), 'second rate-limited request is allowed');
select ok(not public.consume_public_booking_rate_limit(repeat('a',64),'availability:public-clinic',2,300), 'request above rate limit is rejected');

select lives_ok(
  format(
    $$select public.create_public_booking('public-clinic','17000000-0000-0000-0000-000000000001','%s 10:00'::timestamp at time zone 'America/Guatemala','Ana','Pérez','1990-05-20','+50255555555','ana@example.test')$$,
    current_date + 7
  ),
  'public user books an available slot'
);
reset role;
select results_eq(
  $$select count(*) from public.patients where organization_id='27000000-0000-0000-0000-000000000001' and created_by is null$$,
  array[1::bigint],
  'public booking creates an organization-owned administrative patient'
);
select results_eq(
  $$select status::text || '|' || booking_source || '|' || coalesce(privacy_consent_version,'') || '|' || (created_by is null)::text from public.appointments where organization_id='27000000-0000-0000-0000-000000000001' order by created_at limit 1$$,
  array['pending|public|public-booking-v1|true'::text],
  'public appointment is pending with immutable consent and source snapshots'
);
set local role service_role;
select lives_ok(
  format(
    $$select public.create_public_booking('public-clinic','17000000-0000-0000-0000-000000000001','%s 09:00'::timestamp at time zone 'America/Guatemala','Ana','Pérez','1990-05-20','+50255555555','ana@example.test')$$,
    current_date + 14
  ),
  'same patient books another available occurrence'
);
reset role;
select results_eq(
  $$select count(*) from public.patients where organization_id='27000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'exact patient identity is reused within the organization'
);
select results_eq(
  $$select count(*) from public.appointments where organization_id='27000000-0000-0000-0000-000000000001'$$,
  array[2::bigint],
  'both public appointments are retained'
);
set local role service_role;
select throws_ok(
  format(
    $$select public.create_public_booking('public-clinic','17000000-0000-0000-0000-000000000001','%s 09:00'::timestamp at time zone 'America/Guatemala','Otra','Persona','1985-01-01','+50244444444',null)$$,
    current_date + 14
  ),
  'P0001',
  'Booking unavailable',
  'stale or overlapping slot is rejected without revealing the cause'
);

reset role;
select ok(not has_table_privilege('anon','public.public_booking_settings','SELECT'), 'anonymous role cannot read settings');
select ok(not has_table_privilege('anon','public.availability_rules','SELECT'), 'anonymous role cannot read rules');
select ok(not has_table_privilege('anon','public.availability_blocks','SELECT'), 'anonymous role cannot read blocks');
select ok(not has_table_privilege('anon','public.public_booking_rate_limits','SELECT'), 'anonymous role cannot read rate-limit records');

select * from finish();
rollback;
