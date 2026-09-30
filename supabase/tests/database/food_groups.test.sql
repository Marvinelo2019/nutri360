begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

select has_table('public','food_groups','food groups table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.food_groups'::regclass),'food groups has RLS');
select has_column('public','meal_plan_items','food_group_id','meal items have food group link');
select has_column('public','meal_plan_items','equivalent_count','meal items have equivalent count');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('17000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','groups-owner@test.local','',now(),'{}','{"full_name":"Groups Owner"}',now(),now()),
('17000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','groups-assistant@test.local','',now(),'{}','{"full_name":"Groups Assistant"}',now(),now()),
('17000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','groups-outsider@test.local','',now(),'{}','{"full_name":"Groups Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by)
values
('27000000-0000-0000-0000-000000000001','Groups Clinic','groups-clinic','17000000-0000-0000-0000-000000000001'),
('27000000-0000-0000-0000-000000000002','Outside Groups Clinic','outside-groups-clinic','17000000-0000-0000-0000-000000000003');
insert into public.organization_memberships (organization_id,user_id,role,status)
values
('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','owner','active'),
('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000002','assistant','active'),
('27000000-0000-0000-0000-000000000002','17000000-0000-0000-0000-000000000003','owner','active');
insert into public.food_groups (
  id, organization_id, name, energy_kcal, protein_g, carbohydrate_g, fat_g, created_by
) values (
  '37000000-0000-0000-0000-000000000002','27000000-0000-0000-0000-000000000002',
  'Outside group',100,5,15,2,'17000000-0000-0000-0000-000000000003'
);

set local role authenticated;
set local request.jwt.claim.sub = '17000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('27000000-0000-0000-0000-000000000001','Group','Patient','1990-01-01','female',null,null,null,null,true)$$,'owner creates patient');
select lives_ok($$select public.create_meal_plan((select id from public.patients where first_name='Group'),'Equivalent plan',current_date,current_date+30,1800,90,225,60,null)$$,'owner creates draft plan');
select lives_ok($$select public.create_food_group(
  '27000000-0000-0000-0000-000000000001','Cereales','Porciones de cereal','1/2 taza cocida',70,3,15,0,10::smallint
)$$,'owner creates food group');
select results_eq(
  $$select name || '|' || energy_kcal || '|' || protein_g || '|' || carbohydrate_g || '|' || fat_g from public.food_groups$$,
  array['Cereales|70|3.00|15.00|0.00'::text],
  'group nutrient values are retained'
);
select throws_ok($$select public.create_food_group(
  '27000000-0000-0000-0000-000000000001','cereales',null,null,80,2,18,0,20::smallint
)$$,'23505',null,'group names are unique within an organization');

select lives_ok($$select public.add_meal_plan_item_with_equivalent(
  (select id from public.meal_plan_meals where name='Desayuno'),
  'Avena',0.5,'taza','Preparar con agua',
  (select id from public.food_groups where name='Cereales'),2
)$$,'owner adds item with equivalents');
select results_eq(
  $$select food_group_name_snapshot || '|' || equivalent_count || '|' || equivalent_energy_kcal from public.meal_plan_items$$,
  array['Cereales|2.00|70'::text],
  'item stores group and equivalent snapshot'
);
select results_eq(
  $$select round(equivalent_count * equivalent_energy_kcal)::integer from public.meal_plan_items$$,
  array[140],
  'estimated item energy multiplies count by snapshot'
);
select lives_ok($$select public.update_food_group(
  (select id from public.food_groups where name='Cereales'),
  'Cereales','Porciones actualizadas','1 unidad',80,4,16,1,10::smallint,true
)$$,'owner updates group definition');
select results_eq(
  $$select equivalent_energy_kcal from public.meal_plan_items$$,
  array[70],
  'existing item snapshot is unchanged after group edit'
);
select lives_ok($$select public.update_meal_plan_item_with_equivalent(
  (select id from public.meal_plan_items),'Avena integral',0.75,'taza',null,
  (select id from public.food_groups where name='Cereales'),1.5
)$$,'draft item equivalent can be updated');
select results_eq(
  $$select equivalent_count::text || '|' || equivalent_energy_kcal from public.meal_plan_items$$,
  array['1.50|80'::text],
  'updating a draft refreshes the configured snapshot'
);
select throws_ok($$select public.update_meal_plan_item_with_equivalent(
  (select id from public.meal_plan_items),'Avena',1,'taza',null,
  '37000000-0000-0000-0000-000000000002',1
)$$,'P0001','Active food group not found','cross-organization group cannot be assigned');
select throws_ok($$select public.update_meal_plan_item_with_equivalent(
  (select id from public.meal_plan_items),'Avena',1,'taza',null,
  (select id from public.food_groups where name='Cereales'),null
)$$,'P0001','Food group and equivalent count must be provided together','partial equivalent assignment is rejected');
select lives_ok($$select public.change_meal_plan_status((select id from public.meal_plans where name='Equivalent plan'),'active')$$,'plan is activated');
select throws_ok($$select public.update_meal_plan_item_with_equivalent(
  (select id from public.meal_plan_items),'Avena',1,'taza',null,
  (select id from public.food_groups where name='Cereales'),1
)$$,'P0001','Only draft meal plans can be changed','active plan equivalent is immutable');
select lives_ok($$select public.update_food_group(
  (select id from public.food_groups where name='Cereales'),
  'Cereales','Inactivo',null,80,4,16,1,10::smallint,false
)$$,'group can be deactivated');
select results_eq($$select is_active from public.food_groups where name='Cereales'$$,array[false],'group active state is stored');
select results_eq($$select count(*) from public.audit_events where entity_type='food_groups'$$,array[3::bigint],'group changes are audited');

set local request.jwt.claim.sub = '17000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.food_groups$$,array[0::bigint],'assistant cannot read food groups');
select throws_ok($$select public.create_food_group(
  '27000000-0000-0000-0000-000000000001','Assistant group',null,null,50,1,10,0,20::smallint
)$$,'P0001','Clinical role required','assistant cannot create group');

set local request.jwt.claim.sub = '17000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.food_groups where organization_id='27000000-0000-0000-0000-000000000001'$$,array[0::bigint],'outsider cannot read clinic groups');
select throws_ok($$select public.update_food_group(
  (select id from public.food_groups where organization_id='27000000-0000-0000-0000-000000000001'),
  'Changed',null,null,50,1,10,0,20::smallint,true
)$$,'P0001','Food group not found','outsider cannot update clinic group');

set local request.jwt.claim.sub = '17000000-0000-0000-0000-000000000001';
select throws_ok($$select public.add_meal_plan_item_with_equivalent(
  (select id from public.meal_plan_meals where name='Cena'),
  'Pan',1,'unidad',null,(select id from public.food_groups where name='Cereales'),1
)$$,'P0001','Only draft meal plans can be changed','active plan cannot receive new equivalent item');
select results_eq($$select count(*) from public.food_groups where is_active$$,array[0::bigint],'deactivated group is excluded from active catalog');
select results_eq($$select count(*) from public.meal_plan_items where equivalent_count is not null$$,array[1::bigint],'linked item remains after group deactivation');

select * from finish();
rollback;
