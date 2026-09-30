begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

select has_table('public','meal_plans','meal plans table exists');
select has_table('public','meal_plan_meals','meal sections table exists');
select has_table('public','meal_plan_items','meal items table exists');
select has_type('public','meal_plan_status','meal plan status enum exists');
select ok((select relrowsecurity from pg_class where oid = 'public.meal_plans'::regclass),'meal plans has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.meal_plan_meals'::regclass),'meal sections has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.meal_plan_items'::regclass),'meal items has RLS');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('13000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','plan-owner@test.local','',now(),'{}','{"full_name":"Plan Owner"}',now(),now()),
('13000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','plan-assistant@test.local','',now(),'{}','{"full_name":"Plan Assistant"}',now(),now()),
('13000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','plan-outsider@test.local','',now(),'{}','{"full_name":"Plan Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by)
values ('23000000-0000-0000-0000-000000000001','Plan Clinic','plan-clinic','13000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status)
values
('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','owner','active'),
('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000002','assistant','active');

set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('23000000-0000-0000-0000-000000000001','Plan','Patient','1990-01-01','female',null,null,null,null,true)$$,'owner creates plan patient');
select lives_ok($$select public.create_meal_plan((select id from public.patients where first_name='Plan'),'Plan inicial',current_date,current_date+30,1800,100,220,55,'Hidratación suficiente')$$,'owner creates meal plan');
select results_eq($$select count(*) from public.meal_plan_meals$$,array[5::bigint],'five default meals are created');
select lives_ok($$select public.add_meal_plan_item((select id from public.meal_plan_meals where name='Desayuno'),'Avena',0.5,'taza','Preparar con agua')$$,'owner adds meal item');
select results_eq($$select food_name from public.meal_plan_items$$,array['Avena'::text],'meal item is stored');
select lives_ok($$select public.update_meal_plan_item((select id from public.meal_plan_items where food_name='Avena'),'Avena integral',0.75,'taza','Agregar fruta')$$,'owner updates draft meal item');
select results_eq($$select food_name || '|' || quantity || '|' || unit || '|' || guidance from public.meal_plan_items$$,array['Avena integral|0.75|taza|Agregar fruta'::text],'meal item changes are stored');
select lives_ok($$select public.change_meal_plan_status((select id from public.meal_plans where name='Plan inicial'),'active')$$,'first plan is activated');
select throws_ok($$select public.update_meal_plan_item((select id from public.meal_plan_items where food_name='Avena integral'),'Avena',1,'taza',null)$$,'P0001','Only draft meal plans can be changed','active plan item cannot be edited');
select lives_ok($$select public.create_meal_plan((select id from public.patients where first_name='Plan'),'Plan seguimiento',current_date+31,current_date+60,1900,105,230,58,null)$$,'second plan is created');
select lives_ok($$select public.add_meal_plan_item((select meal.id from public.meal_plan_meals meal join public.meal_plans plan on plan.id=meal.meal_plan_id where plan.name='Plan seguimiento' and meal.name='Desayuno'),'Huevo',2,'unidades',null)$$,'second plan receives an item');
select lives_ok($$select public.change_meal_plan_status((select id from public.meal_plans where name='Plan seguimiento'),'active')$$,'second plan is activated');
select results_eq($$select status from public.meal_plans where name='Plan inicial'$$,array['archived'::public.meal_plan_status],'prior active plan is archived');
select throws_ok($$select public.add_meal_plan_item((select meal.id from public.meal_plan_meals meal join public.meal_plans plan on plan.id=meal.meal_plan_id where plan.name='Plan seguimiento' and meal.name='Cena'),'Manzana',1,'unidad',null)$$,'P0001','Only draft meal plans can be changed','active plan is immutable');
select lives_ok($$select public.record_meal_plan_read((select id from public.meal_plans where name='Plan seguimiento'))$$,'clinical read is recorded');
select results_eq($$select count(*) from public.audit_events where action='read' and entity_type='meal_plans'$$,array[1::bigint],'meal plan read has audit event');

set local request.jwt.claim.sub = '13000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.meal_plans$$,array[0::bigint],'assistant cannot read meal plans');
select throws_ok($$select public.create_meal_plan((select id from public.patients where first_name='Plan'),'Unauthorized',null,null,null,null,null,null,null)$$,'P0001','Clinical role required','assistant cannot create meal plans');

set local request.jwt.claim.sub = '13000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.meal_plans$$,array[0::bigint],'outsider cannot read meal plans');

select * from finish();
rollback;
