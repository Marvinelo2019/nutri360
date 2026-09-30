begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select has_table('public','consultations','consultations table exists');
select has_type('public','consultation_type','consultation type exists');
select has_type('public','consultation_status','consultation status exists');
select ok((select relrowsecurity from pg_class where oid='public.consultations'::regclass),'consultations has RLS');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('15000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','consult-owner@test.local','',now(),'{}','{"full_name":"Consult Owner"}',now(),now()),
('15000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','consult-assistant@test.local','',now(),'{}','{"full_name":"Consult Assistant"}',now(),now()),
('15000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','consult-outsider@test.local','',now(),'{}','{"full_name":"Consult Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by)
values ('25000000-0000-0000-0000-000000000001','Consult Clinic','consult-clinic','15000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status)
values
('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','owner','active'),
('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000002','assistant','active');

set local role authenticated;
set local request.jwt.claim.sub = '15000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('25000000-0000-0000-0000-000000000001','Consulta','Paciente','1992-04-10','female',null,null,null,null,true)$$,'owner creates patient');
select lives_ok($$select public.create_consultation((select id from public.patients where first_name='Consulta'),'initial',now() at time zone 'America/Guatemala')$$,'owner creates consultation draft');
select results_eq($$select status from public.consultations$$,array['draft'::public.consultation_status],'new consultation is a draft');
select lives_ok($$select public.update_consultation_draft((select id from public.consultations),'Refiere apetito estable','Peso y talla registrados','Estado nutricional evaluado','Plan nutricional individual','Consulta inicial')$$,'owner updates SOAP draft');
select results_eq($$select assessment from public.consultations$$,array['Estado nutricional evaluado'::text],'SOAP content is stored');
select lives_ok($$select public.complete_consultation((select id from public.consultations))$$,'owner completes consultation');
select results_eq($$select status from public.consultations$$,array['completed'::public.consultation_status],'consultation is completed');
select throws_ok($$select public.update_consultation_draft((select id from public.consultations),'Cambio',null,null,null,null)$$,'P0001','Completed consultations are immutable','completed consultation cannot be edited');
select lives_ok($$select public.record_consultation_read((select id from public.consultations))$$,'clinical read is recorded');
select results_eq($$select count(*) from public.audit_events where action='read' and entity_type='consultations'$$,array[1::bigint],'consultation read has audit event');

set local request.jwt.claim.sub = '15000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.consultations$$,array[0::bigint],'assistant cannot read consultations');
select throws_ok($$select public.create_consultation((select id from public.patients where first_name='Consulta'),'follow_up',now() at time zone 'America/Guatemala')$$,'P0001','Clinical role required','assistant cannot create consultation');

set local request.jwt.claim.sub = '15000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.consultations$$,array[0::bigint],'outsider cannot read consultations');
select throws_ok($$select public.record_consultation_read((select id from public.consultations))$$,'P0001','Consultation not found','outsider cannot read through RPC');

set local request.jwt.claim.sub = '15000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_consultation((select id from public.patients where first_name='Consulta'),'follow_up',now() at time zone 'America/Guatemala')$$,'owner creates second draft');
select throws_ok($$select public.complete_consultation((select id from public.consultations where status='draft'))$$,'P0001','Assessment and plan are required to complete a consultation','empty draft cannot be completed');

select * from finish();
rollback;
