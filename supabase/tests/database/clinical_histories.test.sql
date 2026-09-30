begin;
create extension if not exists pgtap with schema extensions;
select plan(21);
select has_table('public','patient_health_histories','health histories exist');
select has_table('public','dietary_histories','dietary histories exist');
select has_table('public','lab_results','lab results exist');
select ok((select relrowsecurity from pg_class where oid='public.lab_results'::regclass),'lab results has RLS');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('16000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','history-owner@test.local','',now(),'{}','{}',now(),now()),
('16000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','history-assistant@test.local','',now(),'{}','{}',now(),now()),
('16000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','history-outsider@test.local','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug,created_by) values ('26000000-0000-0000-0000-000000000001','History Clinic','history-clinic','16000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','owner','active'),
('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000002','assistant','active');
set local role authenticated;
set local request.jwt.claim.sub='16000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('26000000-0000-0000-0000-000000000001','Historia','Paciente','1990-01-01','female',null,null,null,null,true)$$,'owner creates patient');
select lives_ok($$select public.save_patient_histories((select id from public.patients where first_name='Historia'),'Sin antecedentes','Ninguno','Diabetes familiar','Penicilina','Ninguno','Desayuno: avena','Tres comidas',2,7,'Camina 3 veces por semana','Frutas','Sin lácteos')$$,'owner saves histories');
select results_eq($$select allergies from public.patient_health_histories$$,array['Penicilina'::text],'allergies stored');
select results_eq($$select water_liters from public.dietary_histories$$,array[2::numeric],'water stored');
select lives_ok($$select public.save_patient_histories((select id from public.patients where first_name='Historia'),'Actualizado',null,null,null,null,null,null,null,null,null,null,null)$$,'owner updates histories');
select results_eq($$select count(*) from public.patient_health_histories$$,array[1::bigint],'history update does not duplicate');
select lives_ok($$select public.record_lab_result((select id from public.patients where first_name='Historia'),'Glucosa',95,'mg/dL',70,100,current_date,'Ayuno')$$,'owner records lab result');
select results_eq($$select test_name || '|' || result_value || '|' || unit from public.lab_results$$,array['Glucosa|95.0000|mg/dL'::text],'lab result stored');

set local request.jwt.claim.sub='16000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.patient_health_histories$$,array[0::bigint],'assistant cannot read health history');
select results_eq($$select count(*) from public.dietary_histories$$,array[0::bigint],'assistant cannot read dietary history');
select results_eq($$select count(*) from public.lab_results$$,array[0::bigint],'assistant cannot read labs');
select throws_ok($$select public.save_patient_histories((select id from public.patients where first_name='Historia'),null,null,null,null,null,null,null,null,null,null,null,null)$$,'P0001','Clinical role required','assistant cannot save history');

set local request.jwt.claim.sub='16000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.lab_results$$,array[0::bigint],'outsider cannot read labs');
select results_eq($$select count(*) from public.patient_health_histories$$,array[0::bigint],'outsider cannot read history');

set local request.jwt.claim.sub='16000000-0000-0000-0000-000000000001';
select results_eq($$select count(*) from public.audit_events where entity_type='patient_health_histories'$$,array[2::bigint],'history changes audited');
select results_eq($$select count(*) from public.audit_events where entity_type='dietary_histories'$$,array[2::bigint],'dietary changes audited');
select results_eq($$select count(*) from public.audit_events where entity_type='lab_results'$$,array[1::bigint],'lab insert audited');

select * from finish();
rollback;
