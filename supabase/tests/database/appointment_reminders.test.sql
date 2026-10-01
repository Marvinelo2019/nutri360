begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

select has_table('public','reminder_settings','reminder settings table exists');
select has_table('public','appointment_reminders','appointment reminder queue exists');
select has_table('public','reminder_delivery_attempts','immutable attempt ledger exists');
select has_type('public','reminder_channel','reminder channel enum exists');
select has_type('public','reminder_status','reminder status enum exists');
select ok((select relrowsecurity from pg_class where oid='public.reminder_settings'::regclass),'reminder settings have RLS');
select ok((select relrowsecurity from pg_class where oid='public.appointment_reminders'::regclass),'reminders have RLS');
select ok((select relrowsecurity from pg_class where oid='public.reminder_delivery_attempts'::regclass),'attempts have RLS');
select ok(not has_function_privilege('authenticated','public.claim_due_appointment_reminders(integer,text)','execute'),'browser roles cannot claim reminder jobs');
select ok(not has_function_privilege('authenticated','private.schedule_appointment_reminders(uuid,boolean)','execute'),'browser roles cannot invoke internal reminder scheduling');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('1a000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reminder-owner@test.local','',now(),'{}','{"full_name":"Reminder Owner"}',now(),now()),
('1a000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reminder-assistant@test.local','',now(),'{}','{"full_name":"Reminder Assistant"}',now(),now()),
('1a000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reminder-outsider@test.local','',now(),'{}','{"full_name":"Reminder Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by) values
('2a000000-0000-4000-8000-000000000001','Reminder Clinic','reminder-clinic','1a000000-0000-0000-0000-000000000001'),
('2a000000-0000-4000-8000-000000000002','Other Reminder Clinic','other-reminder-clinic','1a000000-0000-0000-0000-000000000003');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('2a000000-0000-4000-8000-000000000001','1a000000-0000-0000-0000-000000000001','owner','active'),
('2a000000-0000-4000-8000-000000000001','1a000000-0000-0000-0000-000000000002','assistant','active'),
('2a000000-0000-4000-8000-000000000002','1a000000-0000-0000-0000-000000000003','owner','active');
select results_eq($$select count(*) from public.reminder_settings where organization_id in ('2a000000-0000-4000-8000-000000000001','2a000000-0000-4000-8000-000000000002')$$,array[2::bigint],'new organizations receive reminder settings');

set local role authenticated;
set local request.jwt.claim.sub='1a000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('2a000000-0000-4000-8000-000000000001','Contact','Patient','1990-01-01','female','+50255550101','contact@test.local',null,null,true)$$,'owner creates patient with phone and email');
select lives_ok($$select public.create_patient('2a000000-0000-4000-8000-000000000001','No Contact','Patient','1991-01-01','female',null,null,null,null,true)$$,'owner creates patient without reminder contact');

set local request.jwt.claim.sub='1a000000-0000-0000-0000-000000000002';
select lives_ok(format($test$select public.create_appointment((select id from public.patients where first_name='Contact'),'1a000000-0000-0000-0000-000000000001','%s 09:00',60,'in_person')$test$,current_date+7),'assistant creates contactable appointment');
select results_eq($$select count(*) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id join public.patients patient on patient.id=appointment.patient_id where patient.first_name='Contact'$$,array[3::bigint],'appointment creates confirmation and two reminders');
select is((select array_agg(kind::text order by kind::text) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id join public.patients patient on patient.id=appointment.patient_id where patient.first_name='Contact'),array['confirmation','reminder_24h','reminder_2h']::text[],'all reminder kinds are unique');
select is((select array_agg(round(extract(epoch from (appointment.starts_at-reminder.scheduled_at))/3600)::integer order by reminder.kind::text) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id join public.patients patient on patient.id=appointment.patient_id where patient.first_name='Contact' and reminder.kind<>'confirmation'),array[24,2]::integer[],'future reminders are scheduled 24 and 2 hours before appointment');
select lives_ok(format($test$select public.create_appointment((select id from public.patients where first_name='No Contact'),'1a000000-0000-0000-0000-000000000001','%s 11:00',60,'phone')$test$,current_date+7),'assistant creates appointment without contact');
select results_eq($$select count(*) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id join public.patients patient on patient.id=appointment.patient_id where patient.first_name='No Contact' and reminder.status='blocked'$$,array[3::bigint],'missing contact blocks all reminder jobs');
select results_eq($$select count(*) from public.appointment_reminders$$,array[6::bigint],'assistant can inspect organization reminder queue');
select throws_ok($$select public.save_reminder_settings('2a000000-0000-4000-8000-000000000001','email',true,true,true)$$,'P0001','Reminder configuration role required','assistant cannot change reminder settings');

set local request.jwt.claim.sub='1a000000-0000-0000-0000-000000000001';
select lives_ok($$select public.save_reminder_settings('2a000000-0000-4000-8000-000000000001','email',true,true,true)$$,'owner changes preferred channel');
select results_eq($$select count(*) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id join public.patients patient on patient.id=appointment.patient_id where patient.first_name='Contact' and reminder.kind<>'confirmation' and reminder.channel='email' and reminder.status='queued'$$,array[2::bigint],'future reminders adopt email channel when contact exists');
select results_eq($$select count(*) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id join public.patients patient on patient.id=appointment.patient_id where patient.first_name='No Contact' and reminder.kind<>'confirmation' and reminder.status='blocked'$$,array[2::bigint],'missing email keeps future reminders blocked');
reset role;
select lives_ok($$select private.schedule_appointment_reminders((select appointment.id from public.appointments appointment join public.patients patient on patient.id=appointment.patient_id where patient.first_name='Contact'),true)$$,'repeated scheduling is accepted');
select results_eq($$select count(*) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id join public.patients patient on patient.id=appointment.patient_id where patient.first_name='Contact'$$,array[3::bigint],'repeated scheduling does not duplicate jobs');

set local role service_role;
create temporary table claimed_reminders on commit drop as
select * from public.claim_due_appointment_reminders(10,'worker-a');
select results_eq($$select count(*) from claimed_reminders$$,array[1::bigint],'worker claims one due contactable confirmation');
select results_eq($$select count(*) from public.claim_due_appointment_reminders(10,'worker-b')$$,array[0::bigint],'leased reminder cannot be claimed twice');
select throws_ok($$select public.complete_appointment_reminder((select id from claimed_reminders),'worker-b','sent','test-provider','message-1',null)$$,'P0001','Reminder lease not found','wrong worker cannot complete lease');
select lives_ok($$select public.complete_appointment_reminder((select id from claimed_reminders),'worker-a','sent','test-provider','message-1',null)$$,'lease owner records successful delivery');
select results_eq($$select count(*) from public.reminder_delivery_attempts where outcome='sent'$$,array[1::bigint],'successful delivery creates immutable attempt');
select results_eq($$select status::text||'|'||provider_message_id from public.appointment_reminders where id=(select id from claimed_reminders)$$,array['sent|message-1'::text],'sent reminder retains provider identifier');

set local role authenticated;
set local request.jwt.claim.sub='1a000000-0000-0000-0000-000000000002';
select lives_ok($$select public.change_appointment_status((select appointment.id from public.appointments appointment join public.patients patient on patient.id=appointment.patient_id where patient.first_name='Contact'),'cancelled')$$,'assistant cancels appointment');
select results_eq($$select count(*) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id join public.patients patient on patient.id=appointment.patient_id where patient.first_name='Contact' and reminder.kind<>'confirmation' and reminder.status='cancelled'$$,array[2::bigint],'appointment cancellation cancels unsent future reminders');

reset role;
select lives_ok(format($test$insert into public.appointments (organization_id,patient_id,professional_user_id,starts_at,ends_at,modality,status,created_by,booking_source,privacy_consent_version,privacy_consent_accepted_at) values ('2a000000-0000-4000-8000-000000000001',(select id from public.patients where first_name='Contact'),'1a000000-0000-0000-0000-000000000001','%s 16:00+00','%s 17:00+00','in_person','pending',null,'public','public-booking-v1',now())$test$,current_date+8,current_date+8),'public booking appointment inserts successfully');
select results_eq($$select count(*) from public.appointment_reminders reminder join public.appointments appointment on appointment.id=reminder.appointment_id where appointment.organization_id='2a000000-0000-4000-8000-000000000001' and appointment.booking_source='public'$$,array[3::bigint],'public booking receives the same reminder schedule');

set local role authenticated;
set local request.jwt.claim.sub='1a000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.appointment_reminders$$,array[0::bigint],'other organization cannot inspect reminders');

select * from finish();
rollback;
