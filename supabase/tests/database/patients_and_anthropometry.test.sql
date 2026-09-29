begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public', 'patients', 'patients table exists');
select has_table('public', 'patient_clinical_profiles', 'clinical profiles table exists');
select has_table('public', 'patient_consents', 'patient consents table exists');
select has_table('public', 'anthropometric_measurements', 'measurements table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.patients'::regclass), 'patients has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.patient_clinical_profiles'::regclass), 'clinical profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.anthropometric_measurements'::regclass), 'measurements has RLS');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('11000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-patients@test.local','',now(),'{}','{"full_name":"Owner"}',now(),now()),
('11000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','assistant-patients@test.local','',now(),'{}','{"full_name":"Assistant"}',now(),now()),
('11000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','outsider-patients@test.local','',now(),'{}','{"full_name":"Outsider"}',now(),now());

insert into public.organizations (id, name, slug, created_by)
values ('21000000-0000-0000-0000-000000000001','Patient Clinic','patient-clinic','11000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id, user_id, role, status)
values
('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','owner','active'),
('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','assistant','active');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select lives_ok($$select public.create_patient('21000000-0000-0000-0000-000000000001','Ana','López','1990-01-01','female','+50255551234','ANA@EXAMPLE.COM','Mejorar hábitos','Control metabólico',true)$$, 'owner creates patient');
select results_eq($$select email from public.patients where first_name = 'Ana'$$, array['ana@example.com'::text], 'patient email is normalized');
select results_eq($$select count(*) from public.patient_clinical_profiles where goal = 'Mejorar hábitos'$$, array[1::bigint], 'clinical profile is created separately');
select results_eq($$select count(*) from public.patient_consents where withdrawn_at is null$$, array[1::bigint], 'active consent is recorded');

select lives_ok($$select public.record_adult_anthropometry((select id from public.patients where first_name = 'Ana'),70,175)$$, 'owner records adult anthropometry');
select results_eq($$select bmi from public.anthropometric_measurements$$, array[22.86::numeric], 'BMI is calculated in database');
select results_eq($$select bmi_classification from public.anthropometric_measurements$$, array['normal'::public.adult_bmi_classification], 'BMI classification is stored');

select lives_ok($$select public.create_patient('21000000-0000-0000-0000-000000000001','Luis','Pérez',(current_date - interval '12 years')::date,'male',null,null,null,null,true)$$, 'minor patient can be registered');
select throws_ok($$select public.record_adult_anthropometry((select id from public.patients where first_name = 'Luis'),45,150)$$, 'P0001', 'Adult calculation requires age 18 or older', 'adult calculation rejects minors');

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.patients$$, array[2::bigint], 'assistant can read administrative patient records');
select results_eq($$select count(*) from public.patient_clinical_profiles$$, array[0::bigint], 'assistant cannot read clinical profiles');
select results_eq($$select count(*) from public.anthropometric_measurements$$, array[0::bigint], 'assistant cannot read measurements');
select lives_ok($$select public.create_patient('21000000-0000-0000-0000-000000000001','Eva','Díaz','1988-04-10',null,null,null,null,null,true)$$, 'assistant can create administrative patient');
select throws_ok($$select public.create_patient('21000000-0000-0000-0000-000000000001','Eva','Clinical','1988-04-10',null,null,null,'Objetivo',null,true)$$, 'P0001', 'Assistants cannot create clinical profile data', 'assistant cannot create clinical data');

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.patients$$, array[0::bigint], 'outsider cannot read clinic patients');

select * from finish();
rollback;
