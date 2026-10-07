begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

select has_table('public','who_growth_reference_sources','WHO source registry exists');
select has_table('public','who_growth_reference_parameters','WHO LMS parameters exist');
select ok((select relrowsecurity from pg_class where oid='public.who_growth_reference_sources'::regclass),'WHO sources have RLS');
select ok((select relrowsecurity from pg_class where oid='public.who_growth_reference_parameters'::regclass),'WHO parameters have RLS');
select ok(not has_table_privilege('authenticated','public.who_growth_reference_sources','SELECT'),'browser roles cannot read WHO sources');
select ok(not has_table_privilege('authenticated','public.who_growth_reference_parameters','SELECT'),'browser roles cannot read WHO parameters');
select results_eq($$select count(*) from public.who_growth_reference_sources$$,array[12::bigint],'all official workbooks are registered');
select results_eq($$select count(*) from public.who_growth_reference_parameters$$,array[11934::bigint],'all generated LMS rows are loaded');
select results_eq($$select count(distinct source_sha256) from public.who_growth_reference_sources$$,array[12::bigint],'each official workbook has a recorded checksum');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('1d000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','growth-owner@test.local','',now(),'{}','{}',now(),now()),
('1d000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','growth-assistant@test.local','',now(),'{}','{}',now(),now()),
('1d000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','growth-outsider@test.local','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug,created_by)
values ('2d000000-0000-0000-0000-000000000001','Growth Clinic','growth-clinic','1d000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('2d000000-0000-0000-0000-000000000001','1d000000-0000-0000-0000-000000000001','owner','active'),
('2d000000-0000-0000-0000-000000000001','1d000000-0000-0000-0000-000000000002','assistant','active');
insert into public.patients (id,organization_id,first_name,last_name,birth_date,growth_reference_sex,created_by) values
('3d000000-0000-0000-0000-000000000001','2d000000-0000-0000-0000-000000000001','Child','Female','2017-04-06','female','1d000000-0000-0000-0000-000000000001'),
('3d000000-0000-0000-0000-000000000002','2d000000-0000-0000-0000-000000000001','Adolescent','Male','2010-01-01','male','1d000000-0000-0000-0000-000000000001'),
('3d000000-0000-0000-0000-000000000003','2d000000-0000-0000-0000-000000000001','Month120','Male','2010-01-01','male','1d000000-0000-0000-0000-000000000001'),
('3d000000-0000-0000-0000-000000000004','2d000000-0000-0000-0000-000000000001','Month121','Female','2010-01-01','female','1d000000-0000-0000-0000-000000000001'),
('3d000000-0000-0000-0000-000000000005','2d000000-0000-0000-0000-000000000001','Missing','Sex','2015-01-01',null,'1d000000-0000-0000-0000-000000000001'),
('3d000000-0000-0000-0000-000000000006','2d000000-0000-0000-0000-000000000001','Adult','Patient','1990-01-01','female','1d000000-0000-0000-0000-000000000001');

select set_config('test.who_bmi_m',(select m_value::text from public.who_growth_reference_parameters where source_id='who2006-bmi-female' and age_value=1000),true);
select set_config('test.who_height_m',(select m_value::text from public.who_growth_reference_parameters where source_id='who2006-height-female' and age_value=1000),true);

set local role authenticated;
set local request.jwt.claim.sub='1d000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.record_paediatric_anthropometry(
    '3d000000-0000-0000-0000-000000000001',
    current_setting('test.who_bmi_m')::numeric*power(current_setting('test.who_height_m')::numeric/100,2),
    current_setting('test.who_height_m')::numeric,
    '2020-01-01 12:00:00+00')$$,
  'owner records an under-five measurement'
);
select results_eq(
  $$select growth_reference_version||'|'||age_days_snapshot||'|'||(weight_for_age_z is not null)::text
    from public.anthropometric_measurements where patient_id='3d000000-0000-0000-0000-000000000001'$$,
  array['who-2006|1000|true'::text],
  'WHO 2006 uses exact age in days and includes weight-for-age'
);
select ok(
  (select abs(bmi_for_age_z)<=0.001 and abs(height_for_age_z)<=0.001
   from public.anthropometric_measurements where patient_id='3d000000-0000-0000-0000-000000000001'),
  'WHO median LMS inputs produce zero BMI- and height-for-age z-scores'
);
select lives_ok(
  $$select public.record_paediatric_anthropometry('3d000000-0000-0000-0000-000000000002',67.5,150,'2021-01-01 12:00:00+00')$$,
  'owner records an adolescent measurement'
);
select ok(
  (select bmi_for_age_z between 3.34 and 3.36
   from public.anthropometric_measurements where patient_id='3d000000-0000-0000-0000-000000000002'),
  'restricted LMS result matches the WHO 11-year-old boy example'
);
select results_eq(
  $$select growth_reference_version||'|'||age_months_snapshot||'|'||(weight_for_age_z is null)::text
    from public.anthropometric_measurements where patient_id='3d000000-0000-0000-0000-000000000002'$$,
  array['who-2007|132|true'::text],
  'WHO 2007 uses completed months and omits weight-for-age after 10 years'
);
select lives_ok(
  $$select public.record_paediatric_anthropometry('3d000000-0000-0000-0000-000000000003',30,135,'2020-01-02 12:00:00+00')$$,
  '120-month measurement is accepted'
);
select ok(
  (select weight_for_age_z is not null from public.anthropometric_measurements where patient_id='3d000000-0000-0000-0000-000000000003'),
  'weight-for-age is present at 120 months'
);
select lives_ok(
  $$select public.record_paediatric_anthropometry('3d000000-0000-0000-0000-000000000004',31,136,'2020-02-01 12:00:00+00')$$,
  '121-month measurement is accepted'
);
select ok(
  (select weight_for_age_z is null from public.anthropometric_measurements where patient_id='3d000000-0000-0000-0000-000000000004'),
  'weight-for-age is absent at 121 months'
);
select throws_ok(
  $$select public.record_paediatric_anthropometry('3d000000-0000-0000-0000-000000000005',30,135,'2020-01-01 12:00:00+00')$$,
  'P0001','Growth reference sex required','missing reference sex is rejected'
);
select throws_ok(
  $$select public.record_paediatric_anthropometry('3d000000-0000-0000-0000-000000000006',70,170,now())$$,
  'P0001','Paediatric calculation requires age under 18','adult patient is rejected by the paediatric pathway'
);
select throws_ok(
  $$select public.record_paediatric_anthropometry('3d000000-0000-0000-0000-000000000001',20,110,now()+interval '1 day')$$,
  'P0001','Measurement date cannot be in the future','future measurement is rejected'
);

set local request.jwt.claim.sub='1d000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.anthropometric_measurements$$,array[0::bigint],'assistant cannot read measurements');
select throws_ok(
  $$select public.record_paediatric_anthropometry('3d000000-0000-0000-0000-000000000001',20,110,now())$$,
  'P0001','Clinical role required','assistant cannot record paediatric measurements'
);
set local request.jwt.claim.sub='1d000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.anthropometric_measurements$$,array[0::bigint],'cross-organization user cannot read measurements');

set local request.jwt.claim.sub='1d000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.record_adult_anthropometry('3d000000-0000-0000-0000-000000000006',70,175)$$,
  'existing adult calculation still works'
);
select results_eq(
  $$select calculation_pathway||'|'||bmi_classification::text||'|'||(bmi_for_age_z is null)::text
    from public.anthropometric_measurements where patient_id='3d000000-0000-0000-0000-000000000006'$$,
  array['adult|normal|true'::text],
  'adult snapshots remain separate from WHO paediatric indicators'
);
select cmp_ok(
  (select count(*) from public.audit_events where organization_id='2d000000-0000-0000-0000-000000000001' and entity_type='anthropometric_measurements'),
  '>=',5::bigint,'measurement creation remains audited'
);

select * from finish();
rollback;
