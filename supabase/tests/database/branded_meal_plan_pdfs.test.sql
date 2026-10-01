begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_column('public','meal_plans','pdf_object_path','meal plans store private PDF path');
select has_column('public','meal_plans','pdf_generated_at','meal plans store PDF generation time');
select has_column('public','meal_plans','pdf_generated_by','meal plans store PDF generator');
select results_eq($$select public::text from storage.buckets where id='organization-assets'$$,array['false'::text],'branding bucket is private');
select results_eq($$select public::text from storage.buckets where id='meal-plan-pdfs'$$,array['false'::text],'meal-plan PDF bucket is private');
select results_eq($$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'meal_plan_pdfs_%'$$,array[4::bigint],'PDF storage has four scoped policies');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('19000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pdf-owner@test.local','',now(),'{}','{"full_name":"PDF Owner"}',now(),now()),
('19000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pdf-nutritionist@test.local','',now(),'{}','{"full_name":"PDF Nutritionist"}',now(),now()),
('19000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pdf-assistant@test.local','',now(),'{}','{"full_name":"PDF Assistant"}',now(),now()),
('19000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pdf-outsider@test.local','',now(),'{}','{"full_name":"PDF Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by) values
('29000000-0000-4000-8000-000000000001','PDF Clinic','pdf-clinic','19000000-0000-0000-0000-000000000001'),
('29000000-0000-4000-8000-000000000002','Other PDF Clinic','other-pdf-clinic','19000000-0000-0000-0000-000000000004');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('29000000-0000-4000-8000-000000000001','19000000-0000-0000-0000-000000000001','owner','active'),
('29000000-0000-4000-8000-000000000001','19000000-0000-0000-0000-000000000002','nutritionist','active'),
('29000000-0000-4000-8000-000000000001','19000000-0000-0000-0000-000000000003','assistant','active'),
('29000000-0000-4000-8000-000000000002','19000000-0000-0000-0000-000000000004','owner','active');

set local role authenticated;
set local request.jwt.claim.sub='19000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('29000000-0000-4000-8000-000000000001','PDF','Patient','1990-01-01','female',null,null,null,null,true)$$,'owner creates synthetic patient');
select lives_ok($$select public.create_meal_plan((select id from public.patients where first_name='PDF'),'Final plan',current_date,current_date+14,1800,100,220,55,'Drink water')$$,'owner creates final plan');
select lives_ok($$select public.add_meal_plan_item((select meal.id from public.meal_plan_meals meal join public.meal_plans plan on plan.id=meal.meal_plan_id where plan.name='Final plan' and meal.name='Desayuno'),'Oatmeal',1,'taza','With fruit')$$,'final plan receives an item');
select lives_ok($$select public.change_meal_plan_status((select id from public.meal_plans where name='Final plan'),'active')$$,'owner activates final plan');
select lives_ok($$select public.create_meal_plan((select id from public.patients where first_name='PDF'),'Draft plan',null,null,null,null,null,null,null)$$,'owner creates draft plan');

do $$
declare final_id uuid; draft_id uuid;
begin
  select id into final_id from public.meal_plans where name='Final plan';
  select id into draft_id from public.meal_plans where name='Draft plan';
  perform set_config('test.pdf_final_plan_id',final_id::text,true);
  perform set_config('test.pdf_draft_plan_id',draft_id::text,true);
end;
$$;

select lives_ok($$insert into storage.objects (bucket_id,name,owner,owner_id) values ('organization-assets','29000000-0000-4000-8000-000000000001/logo.png',auth.uid(),auth.uid()::text)$$,'owner stores organization logo in own folder');
select lives_ok($$select public.update_organization_branding('29000000-0000-4000-8000-000000000001','PDF Nutrition','#336699','+50255550101','29000000-0000-4000-8000-000000000001/logo.png')$$,'owner updates clinic branding');
select results_eq($$select name||'|'||brand_color||'|'||phone_e164||'|'||logo_path from public.organizations where id='29000000-0000-4000-8000-000000000001'$$,array['PDF Nutrition|#336699|+50255550101|29000000-0000-4000-8000-000000000001/logo.png'::text],'branding fields are stored together');
select lives_ok(format($test$insert into storage.objects (bucket_id,name,owner,owner_id) values ('meal-plan-pdfs','29000000-0000-4000-8000-000000000001/%s/meal-plan-20260930T170000Z.pdf',auth.uid(),auth.uid()::text)$test$,current_setting('test.pdf_final_plan_id')),'clinician stores PDF in organization folder');
select lives_ok(format($test$select public.register_meal_plan_pdf('%s','29000000-0000-4000-8000-000000000001/%s/meal-plan-20260930T170000Z.pdf')$test$,current_setting('test.pdf_final_plan_id'),current_setting('test.pdf_final_plan_id')),'active plan registers generated PDF');
select results_eq($$select pdf_generated_by::text from public.meal_plans where id=current_setting('test.pdf_final_plan_id')::uuid$$,array['19000000-0000-0000-0000-000000000001'::text],'PDF metadata records authenticated generator');
select results_eq($$select count(*) from public.audit_events where action='generate_pdf' and entity_id=current_setting('test.pdf_final_plan_id')::uuid$$,array[1::bigint],'PDF generation is audited');
select results_eq(format($test$select public.record_meal_plan_pdf_download('%s')$test$,current_setting('test.pdf_final_plan_id')),array[format('29000000-0000-4000-8000-000000000001/%s/meal-plan-20260930T170000Z.pdf',current_setting('test.pdf_final_plan_id'))],'authorized PDF download returns private object path');
select results_eq($$select count(*) from public.audit_events where action='download_pdf' and entity_id=current_setting('test.pdf_final_plan_id')::uuid$$,array[1::bigint],'PDF download is audited');
select lives_ok(format($test$insert into storage.objects (bucket_id,name,owner,owner_id) values ('meal-plan-pdfs','29000000-0000-4000-8000-000000000001/%s/meal-plan-20260930T170001Z.pdf',auth.uid(),auth.uid()::text)$test$,current_setting('test.pdf_draft_plan_id')),'draft PDF object can be staged before registration');
select throws_ok(format($test$select public.register_meal_plan_pdf('%s','29000000-0000-4000-8000-000000000001/%s/meal-plan-20260930T170001Z.pdf')$test$,current_setting('test.pdf_draft_plan_id'),current_setting('test.pdf_draft_plan_id')),'P0001','Draft meal plans cannot generate final PDFs','draft plan cannot register final PDF');
select throws_ok($$select public.update_organization_branding('29000000-0000-4000-8000-000000000001','PDF Nutrition','#336699',null,'other/logo.png')$$,'P0001','Invalid organization logo path','branding rejects foreign logo path');

set local request.jwt.claim.sub='19000000-0000-0000-0000-000000000002';
select throws_ok($$select public.update_organization_branding('29000000-0000-4000-8000-000000000001','Changed','#336699',null,null)$$,'P0001','Owner role required','nutritionist cannot change clinic branding');
select results_eq($$select count(*) from storage.objects where bucket_id='meal-plan-pdfs'$$,array[2::bigint],'nutritionist can read own organization PDF objects');
select lives_ok(format($test$select public.record_meal_plan_pdf_download('%s')$test$,current_setting('test.pdf_final_plan_id')),'nutritionist can download generated plan');

set local request.jwt.claim.sub='19000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from storage.objects where bucket_id='meal-plan-pdfs'$$,array[0::bigint],'assistant cannot read clinical PDF objects');
select throws_ok(format($test$select public.record_meal_plan_pdf_download('%s')$test$,current_setting('test.pdf_final_plan_id')),'P0001','Clinical role required','assistant cannot download meal-plan PDF');

set local request.jwt.claim.sub='19000000-0000-0000-0000-000000000004';
select results_eq($$select count(*) from storage.objects where bucket_id in ('organization-assets','meal-plan-pdfs')$$,array[0::bigint],'other organization cannot read branding or PDF objects');
select throws_ok($$insert into storage.objects (bucket_id,name,owner,owner_id) values ('meal-plan-pdfs','29000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000001/meal-plan-20260930T170002Z.pdf',auth.uid(),auth.uid()::text)$$,'42501',null,'other organization cannot write into clinic PDF folder');
select throws_ok(format($test$select public.register_meal_plan_pdf('%s','29000000-0000-4000-8000-000000000001/%s/meal-plan-20260930T170000Z.pdf')$test$,current_setting('test.pdf_final_plan_id'),current_setting('test.pdf_final_plan_id')),'P0001','Clinical role required','other organization cannot register clinic PDF');

select * from finish();
rollback;
