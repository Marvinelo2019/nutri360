begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

select has_table('public','meal_plan_templates','template table exists');
select has_table('public','meal_plan_template_meals','template meals table exists');
select has_table('public','meal_plan_template_items','template items table exists');
select ok((select relrowsecurity from pg_class where oid='public.meal_plan_templates'::regclass),'templates have RLS');
select ok((select relrowsecurity from pg_class where oid='public.meal_plan_template_meals'::regclass),'template meals have RLS');
select ok((select relrowsecurity from pg_class where oid='public.meal_plan_template_items'::regclass),'template items have RLS');
select hasnt_column('public','meal_plan_templates','patient_id','template does not contain patient identity');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('18000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','template-owner@test.local','',now(),'{}','{"full_name":"Template Owner"}',now(),now()),
('18000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','template-assistant@test.local','',now(),'{}','{"full_name":"Template Assistant"}',now(),now()),
('18000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','template-outsider@test.local','',now(),'{}','{"full_name":"Template Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by) values
('28000000-0000-0000-0000-000000000001','Template Clinic','template-clinic','18000000-0000-0000-0000-000000000001'),
('28000000-0000-0000-0000-000000000002','Other Template Clinic','other-template-clinic','18000000-0000-0000-0000-000000000003');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('28000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001','owner','active'),
('28000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000002','assistant','active'),
('28000000-0000-0000-0000-000000000002','18000000-0000-0000-0000-000000000003','owner','active');

set local role authenticated;
set local request.jwt.claim.sub='18000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('28000000-0000-0000-0000-000000000001','Source','Patient','1990-01-01','female',null,null,null,null,true)$$,'owner creates source patient');
select lives_ok($$select public.create_patient('28000000-0000-0000-0000-000000000001','Target','Patient','1991-01-01','female',null,null,null,null,true)$$,'owner creates target patient');
select lives_ok($$select public.create_meal_plan((select id from public.patients where first_name='Source'),'Source plan',current_date,current_date+30,1800,100,220,55,'Snapshot instructions')$$,'owner creates source plan');
select lives_ok($$select public.create_food_group('28000000-0000-0000-0000-000000000001','Cereal',null,'1 tortilla',70,2,15,1,10::smallint)$$,'owner creates equivalent group');
select lives_ok($$select public.add_meal_plan_item_with_equivalent((select meal.id from public.meal_plan_meals meal join public.meal_plans plan on plan.id=meal.meal_plan_id where plan.name='Source plan' and meal.name='Desayuno'),'Tortilla',1,'unidad','Caliente',(select id from public.food_groups where name='Cereal'),2)$$,'source plan receives equivalent item');
select lives_ok($$select public.create_meal_plan_template_from_plan((select id from public.meal_plans where name='Source plan'),'Plantilla base','Mantenimiento','Estructura reutilizable')$$,'owner snapshots plan as template');
select results_eq($$select count(*) from public.meal_plan_template_meals$$,array[5::bigint],'all meal sections are copied');
select results_eq($$select count(*) from public.meal_plan_template_items$$,array[1::bigint],'active source items are copied');
select results_eq($$select food_name||'|'||equivalent_count||'|'||equivalent_energy_kcal from public.meal_plan_template_items$$,array['Tortilla|2.00|70'::text],'equivalent snapshot is preserved');
select lives_ok($$select public.update_meal_plan_item_with_equivalent((select id from public.meal_plan_items where food_name='Tortilla'),'Pan',1,'unidad',null,null,null)$$,'source draft remains independently editable');
select results_eq($$select food_name from public.meal_plan_template_items$$,array['Tortilla'::text],'source edits do not change template snapshot');
select lives_ok($$select public.create_meal_plan_from_template((select id from public.meal_plan_templates where name='Plantilla base'),(select id from public.patients where first_name='Target'),'Plan desde plantilla',current_date+31,current_date+60)$$,'owner creates draft from template');
select results_eq($$select status::text||'|'||target_energy_kcal||'|'||instructions from public.meal_plans where name='Plan desde plantilla'$$,array['draft|1800|Snapshot instructions'::text],'new plan copies targets and remains draft');
select results_eq($$select count(*) from public.meal_plan_meals meal join public.meal_plans plan on plan.id=meal.meal_plan_id where plan.name='Plan desde plantilla'$$,array[5::bigint],'new plan copies meal structure');
select results_eq($$select item.food_name||'|'||item.equivalent_count from public.meal_plan_items item join public.meal_plans plan on plan.id=item.meal_plan_id where plan.name='Plan desde plantilla'$$,array['Tortilla|2.00'::text],'new plan copies independent item snapshot');
select lives_ok($$select public.record_meal_plan_template_read((select id from public.meal_plan_templates where name='Plantilla base'))$$,'template read is recorded');
select results_eq($$select count(*) from public.audit_events where action='read' and entity_type='meal_plan_templates'$$,array[1::bigint],'template read has audit event');
do $$
declare source_id uuid;
begin
  select id into source_id from public.meal_plans where name='Source plan';
  perform set_config('test.template_source_plan_id',source_id::text,true);
end;
$$;

set local request.jwt.claim.sub='18000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.meal_plan_templates$$,array[0::bigint],'assistant cannot read templates');
select throws_ok($$select public.create_meal_plan_template_from_plan(current_setting('test.template_source_plan_id')::uuid,'Unauthorized',null,null)$$,'P0001','Clinical role required','assistant cannot create template');

set local request.jwt.claim.sub='18000000-0000-0000-0000-000000000003';
select lives_ok($$select public.create_patient('28000000-0000-0000-0000-000000000002','Other','Patient','1992-01-01','male',null,null,null,null,true)$$,'outsider creates patient in own organization');
select results_eq($$select count(*) from public.meal_plan_templates$$,array[0::bigint],'outsider cannot read template');
select throws_ok($$select public.create_meal_plan_from_template((select id from public.meal_plan_templates where name='Plantilla base'),(select id from public.patients where first_name='Other'),'Unauthorized',null,null)$$,'P0001','Active template not found','RLS does not reveal a cross-organization template to outsider queries');

set local request.jwt.claim.sub='18000000-0000-0000-0000-000000000001';
select throws_ok($$select public.create_meal_plan_from_template((select id from public.meal_plan_templates where name='Plantilla base'),(select id from public.patients where first_name='Other'),'Cross organization',null,null)$$,'P0001','Active patient not found','template cannot target a patient from another organization');
select lives_ok($$select public.archive_meal_plan_template((select id from public.meal_plan_templates where name='Plantilla base'))$$,'owner archives template');
select throws_ok($$select public.create_meal_plan_from_template((select id from public.meal_plan_templates where name='Plantilla base'),(select id from public.patients where first_name='Target'),'Unavailable template',null,null)$$,'P0001','Active template not found','archived template cannot be instantiated');
select throws_ok($$select public.create_meal_plan_template_from_plan((select id from public.meal_plans where name='Source plan'),'','',null)$$,'23514',null,'empty template name is rejected by database constraint');

select * from finish();
rollback;
