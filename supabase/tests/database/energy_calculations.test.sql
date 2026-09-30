begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_table('public','energy_calculations','energy calculations table exists');
select has_type('public','energy_formula','energy formula enum exists');
select has_type('public','macro_distribution_method','macro method enum exists');
select ok((select relrowsecurity from pg_class where oid = 'public.energy_calculations'::regclass),'energy calculations has RLS');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('16000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','energy-owner@test.local','',now(),'{}','{"full_name":"Energy Owner"}',now(),now()),
('16000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','energy-assistant@test.local','',now(),'{}','{"full_name":"Energy Assistant"}',now(),now()),
('16000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','energy-outsider@test.local','',now(),'{}','{"full_name":"Energy Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by)
values
('26000000-0000-0000-0000-000000000001','Energy Clinic','energy-clinic','16000000-0000-0000-0000-000000000001'),
('26000000-0000-0000-0000-000000000002','Outside Energy Clinic','outside-energy-clinic','16000000-0000-0000-0000-000000000003');
insert into public.organization_memberships (organization_id,user_id,role,status)
values
('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','owner','active'),
('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000002','assistant','active'),
('26000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000003','owner','active');

set local role authenticated;
set local request.jwt.claim.sub = '16000000-0000-0000-0000-000000000001';
select lives_ok(format(
  $$select public.create_patient('26000000-0000-0000-0000-000000000001','Energy','Patient',%L,'male',null,null,null,null,true)$$,
  (current_date - interval '35 years')::date
),'owner creates adult patient');
select lives_ok($$select public.record_adult_anthropometry((select id from public.patients where first_name='Energy'),70,175,now())$$,'owner records source measurement');

select lives_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='Energy'),
  (select id from public.anthropometric_measurements where weight_kg=70),
  'mifflin_st_jeor',1.55,-500,'percentage',30,40,30
)$$,'owner creates percentage calculation');
select results_eq($$select count(*) from public.energy_calculations$$,array[1::bigint],'calculation is stored');
select results_eq($$select formula_version from public.energy_calculations$$,array['mifflin-st-jeor-1990-v1'::text],'formula version is retained');
select results_eq(
  $$select round(resting_energy_kcal,2)::text || '|' || round(total_energy_kcal,2)::text || '|' || target_energy_kcal::text from public.energy_calculations$$,
  array['1625.85|2520.07|2020'::text],
  'Mifflin energy outputs are reproducible'
);
select results_eq(
  $$select round(target_protein_g,2)::text || '|' || round(target_carbohydrate_g,2)::text || '|' || round(target_fat_g,2)::text || '|' || macro_energy_kcal::text from public.energy_calculations$$,
  array['151.50|202.00|67.33|2020'::text],
  'percentage macros are converted to grams'
);

select lives_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='Energy'),
  (select id from public.anthropometric_measurements where weight_kg=70),
  'harris_benedict_revised',1,0,'percentage',20,50,30
)$$,'revised Harris-Benedict calculation succeeds');
select results_eq(
  $$select round(resting_energy_kcal,2) from public.energy_calculations where formula='harris_benedict_revised'$$,
  array[1667.28::numeric],
  'revised Harris-Benedict coefficients are applied'
);
select lives_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='Energy'),
  (select id from public.anthropometric_measurements where weight_kg=70),
  'fao_who_unu',1,0,'percentage',20,50,30
)$$,'FAO WHO UNU calculation succeeds');
select results_eq(
  $$select round(resting_energy_kcal,2) from public.energy_calculations where formula='fao_who_unu'$$,
  array[1720.00::numeric],
  'FAO WHO UNU adult age band and height coefficients are applied'
);
select lives_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='Energy'),
  (select id from public.anthropometric_measurements where weight_kg=70),
  'mifflin_st_jeor',1.55,-500,'grams_per_kg',1.8,3,0.8
)$$,'grams per kilogram calculation succeeds');
select results_eq(
  $$select round(target_protein_g,2)::text || '|' || round(target_carbohydrate_g,2)::text || '|' || round(target_fat_g,2)::text || '|' || macro_energy_kcal::text from public.energy_calculations where macro_method='grams_per_kg'$$,
  array['126.00|210.00|56.00|1848'::text],
  'grams per kilogram use the measurement weight snapshot'
);
select throws_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='Energy'),
  (select id from public.anthropometric_measurements where weight_kg=70),
  'mifflin_st_jeor',1.2,0,'percentage',20,20,20
)$$,'P0001','Macronutrient percentages must total 100','invalid percentage total is rejected');

select lives_ok(format(
  $$select public.create_patient('26000000-0000-0000-0000-000000000001','Other','Patient',%L,'female',null,null,null,null,true)$$,
  (current_date - interval '30 years')::date
),'owner creates second patient');
select lives_ok($$select public.record_adult_anthropometry((select id from public.patients where first_name='Other'),60,165,now())$$,'owner records second patient measurement');
select throws_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='Energy'),
  (select id from public.anthropometric_measurements where weight_kg=60),
  'mifflin_st_jeor',1.2,0,'percentage',20,50,30
)$$,'P0001','Patient measurement not found','measurement from another patient is rejected');
select lives_ok($$select public.record_energy_calculation_read((select id from public.energy_calculations limit 1))$$,'calculation read is audited');
select results_eq($$select count(*) from public.audit_events where entity_type='energy_calculations' and action='read'$$,array[1::bigint],'read audit event exists');
select throws_ok($$update public.energy_calculations set goal_adjustment_kcal=0 where formula='mifflin_st_jeor'$$,'42501','permission denied for table energy_calculations','authenticated users cannot update calculations');

set local request.jwt.claim.sub = '16000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.energy_calculations$$,array[0::bigint],'assistant cannot read energy calculations');
select throws_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='Energy'),
  (select id from public.anthropometric_measurements where weight_kg=70),
  'mifflin_st_jeor',1.2,0,'percentage',20,50,30
)$$,'P0001','Clinical role required','assistant cannot create calculations');

set local request.jwt.claim.sub = '16000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.energy_calculations$$,array[0::bigint],'cross-organization user cannot read calculations');
select throws_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='Energy'),
  (select id from public.anthropometric_measurements where weight_kg=70),
  'mifflin_st_jeor',1.2,0,'percentage',20,50,30
)$$,'P0001','Patient not found','cross-organization user cannot create calculations');

set local request.jwt.claim.sub = '16000000-0000-0000-0000-000000000001';
select lives_ok(format(
  $$select public.create_patient('26000000-0000-0000-0000-000000000001','NoSex','Patient',%L,null,null,null,null,null,true)$$,
  (current_date - interval '40 years')::date
),'owner creates patient without reference sex');
select lives_ok($$select public.record_adult_anthropometry((select id from public.patients where first_name='NoSex'),65,170,now())$$,'measurement can exist before reference sex is completed');
select throws_ok($$select public.create_energy_calculation(
  (select id from public.patients where first_name='NoSex'),
  (select id from public.anthropometric_measurements where patient_id=(select id from public.patients where first_name='NoSex')),
  'mifflin_st_jeor',1.2,0,'percentage',20,50,30
)$$,'P0001','Reference sex is required for this calculation','calculation requires reference sex');

select * from finish();
rollback;
