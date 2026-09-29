begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

select has_table('public', 'appointments', 'appointments table exists');
select has_type('public', 'appointment_status', 'appointment status enum exists');
select has_type('public', 'appointment_modality', 'appointment modality enum exists');
select ok((select relrowsecurity from pg_class where oid = 'public.appointments'::regclass), 'appointments has RLS');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('12000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','agenda-owner@test.local','',now(),'{}','{"full_name":"Owner Agenda"}',now(),now()),
('12000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','agenda-assistant@test.local','',now(),'{}','{"full_name":"Assistant Agenda"}',now(),now()),
('12000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','agenda-nutritionist@test.local','',now(),'{}','{"full_name":"Nutritionist Agenda"}',now(),now()),
('12000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','agenda-outsider@test.local','',now(),'{}','{"full_name":"Outsider Agenda"}',now(),now());

insert into public.organizations (id, name, slug, created_by)
values ('22000000-0000-0000-0000-000000000001','Agenda Clinic','agenda-clinic','12000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id, user_id, role, status)
values
('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','owner','active'),
('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','assistant','active'),
('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000003','nutritionist','active');

set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('22000000-0000-0000-0000-000000000001','Agenda','Patient','1990-01-01','female',null,null,null,null,true)$$, 'owner creates appointment patient');

set local request.jwt.claim.sub = '12000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.list_scheduling_professionals('22000000-0000-0000-0000-000000000001')$$, array[2::bigint], 'assistant can list assignable professionals');
select lives_ok(format($test$select public.create_appointment((select id from public.patients where first_name = 'Agenda'),'12000000-0000-0000-0000-000000000001','%s 09:00',60,'in_person')$test$, current_date + 7), 'assistant schedules appointment');
select results_eq($$select to_char(starts_at at time zone 'UTC', 'HH24:MI') from public.appointments order by starts_at limit 1$$, array['15:00'::text], 'Guatemala local time is stored as UTC');
select throws_ok(format($test$select public.create_appointment((select id from public.patients where first_name = 'Agenda'),'12000000-0000-0000-0000-000000000001','%s 09:30',60,'video')$test$, current_date + 7), 'P0001', 'Professional already has an appointment in that time range', 'overlapping appointment is rejected');
select lives_ok(format($test$select public.create_appointment((select id from public.patients where first_name = 'Agenda'),'12000000-0000-0000-0000-000000000001','%s 10:00',30,'phone')$test$, current_date + 7), 'back-to-back appointment is accepted');
select lives_ok(format($test$select public.create_appointment((select id from public.patients where first_name = 'Agenda'),'12000000-0000-0000-0000-000000000003','%s 09:30',60,'video')$test$, current_date + 7), 'different professional can use same time');
select results_eq(format($test$select count(*) from public.list_appointments_for_local_date('22000000-0000-0000-0000-000000000001','%s')$test$, current_date + 7), array[3::bigint], 'local daily agenda returns all appointments');
select lives_ok($$select public.change_appointment_status((select id from public.appointments order by starts_at, id limit 1),'completed')$$, 'assistant can complete appointment');
select throws_ok($$select public.change_appointment_status((select id from public.appointments where status = 'completed'),'cancelled')$$, 'P0001', 'Final appointment status cannot be changed', 'final status cannot change');
select throws_ok(format($test$select public.create_appointment((select id from public.patients where first_name = 'Agenda'),'12000000-0000-0000-0000-000000000001','%s 12:00',15,'in_person')$test$, current_date + 7), 'P0001', 'Duration must be between 30 and 240 minutes', 'invalid duration is rejected');
select throws_ok(format($test$select public.create_appointment((select id from public.patients where first_name = 'Agenda'),'12000000-0000-0000-0000-000000000004','%s 12:00',60,'in_person')$test$, current_date + 7), 'P0001', 'Professional is not active in organization', 'outsider cannot be assigned');

set local request.jwt.claim.sub = '12000000-0000-0000-0000-000000000004';
select results_eq($$select count(*) from public.appointments$$, array[0::bigint], 'outsider cannot read appointments');
select results_eq(format($test$select count(*) from public.list_appointments_for_local_date('22000000-0000-0000-0000-000000000001','%s')$test$, current_date + 7), array[0::bigint], 'outsider RPC returns no appointments');

select * from finish();
rollback;
