begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_function(
  'public','list_appointments_for_local_month',array['uuid','date'],
  'monthly appointment report function exists'
);

insert into auth.users (
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('1d000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-owner@test.local','',now(),'{}','{"full_name":"Report Owner"}',now(),now()),
('1d000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-assistant@test.local','',now(),'{}','{"full_name":"Report Assistant"}',now(),now()),
('1d000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','report-outsider@test.local','',now(),'{}','{"full_name":"Report Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by) values
('2d000000-0000-4000-8000-000000000001','Report Clinic','report-clinic','1d000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('2d000000-0000-4000-8000-000000000001','1d000000-0000-0000-0000-000000000001','owner','active'),
('2d000000-0000-4000-8000-000000000001','1d000000-0000-0000-0000-000000000002','assistant','active');

set local role authenticated;
set local request.jwt.claim.sub='1d000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.create_patient(
    '2d000000-0000-4000-8000-000000000001','Report','Patient','1990-01-01',
    'female',null,null,null,null,true
  )$$,
  'owner creates report patient'
);

reset role;
insert into public.appointments (
  organization_id,patient_id,professional_user_id,starts_at,ends_at,
  modality,status,created_by
) values
(
  '2d000000-0000-4000-8000-000000000001',
  (select id from public.patients where first_name='Report'),
  '1d000000-0000-0000-0000-000000000001',
  '2026-10-01 05:30:00+00','2026-10-01 06:00:00+00',
  'in_person','completed','1d000000-0000-0000-0000-000000000001'
),
(
  '2d000000-0000-4000-8000-000000000001',
  (select id from public.patients where first_name='Report'),
  '1d000000-0000-0000-0000-000000000001',
  '2026-10-01 06:30:00+00','2026-10-01 07:00:00+00',
  'in_person','no_show','1d000000-0000-0000-0000-000000000001'
),
(
  '2d000000-0000-4000-8000-000000000001',
  (select id from public.patients where first_name='Report'),
  '1d000000-0000-0000-0000-000000000001',
  '2026-11-01 05:30:00+00','2026-11-01 06:00:00+00',
  'phone','confirmed','1d000000-0000-0000-0000-000000000001'
),
(
  '2d000000-0000-4000-8000-000000000001',
  (select id from public.patients where first_name='Report'),
  '1d000000-0000-0000-0000-000000000001',
  '2026-11-01 06:30:00+00','2026-11-01 07:00:00+00',
  'video','completed','1d000000-0000-0000-0000-000000000001'
);

set local role authenticated;
set local request.jwt.claim.sub='1d000000-0000-0000-0000-000000000002';
select results_eq(
  $$select count(*) from public.list_appointments_for_local_month(
    '2d000000-0000-4000-8000-000000000001','2026-10-01'
  )$$,
  array[2::bigint],
  'Guatemala October includes exact local month boundaries'
);
select results_eq(
  $$select status::text from public.list_appointments_for_local_month(
    '2d000000-0000-4000-8000-000000000001','2026-10-01'
  ) order by starts_at$$,
  array['no_show'::text,'confirmed'::text],
  'monthly report preserves appointment outcomes'
);
select results_eq(
  $$select count(*) from public.list_appointments_for_local_month(
    '2d000000-0000-4000-8000-000000000001','2026-09-01'
  )$$,
  array[1::bigint],
  'UTC timestamp before local midnight remains in September'
);
select results_eq(
  $$select count(*) from public.list_appointments_for_local_month(
    '2d000000-0000-4000-8000-000000000001','2026-11-01'
  )$$,
  array[1::bigint],
  'UTC timestamp before next local midnight remains in October'
);

set local request.jwt.claim.sub='1d000000-0000-0000-0000-000000000003';
select results_eq(
  $$select count(*) from public.list_appointments_for_local_month(
    '2d000000-0000-4000-8000-000000000001','2026-10-01'
  )$$,
  array[0::bigint],
  'outsider receives no monthly appointment rows'
);
select results_eq(
  $$select count(*) from public.appointments$$,
  array[0::bigint],
  'outsider cannot read appointment rows directly'
);
select ok(
  not has_function_privilege(
    'anon','public.list_appointments_for_local_month(uuid,date)','execute'
  ),
  'anonymous users cannot execute monthly reporting'
);

select * from finish();
rollback;
