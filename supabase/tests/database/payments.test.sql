begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select has_table('public','payments','payments table exists');
select has_type('public','payment_status','payment status enum exists');
select has_type('public','payment_method','payment method enum exists');
select ok((select relrowsecurity from pg_class where oid = 'public.payments'::regclass),'payments has RLS');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('14000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pay-owner@test.local','',now(),'{}','{"full_name":"Pay Owner"}',now(),now()),
('14000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pay-assistant@test.local','',now(),'{}','{"full_name":"Pay Assistant"}',now(),now()),
('14000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pay-outsider@test.local','',now(),'{}','{"full_name":"Pay Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by)
values ('24000000-0000-0000-0000-000000000001','Pay Clinic','pay-clinic','14000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status)
values
('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','owner','active'),
('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000002','assistant','active');

set local role authenticated;
set local request.jwt.claim.sub = '14000000-0000-0000-0000-000000000001';
select lives_ok($$select public.create_patient('24000000-0000-0000-0000-000000000001','Pay','Patient','1990-01-01','female',null,null,null,null,true)$$,'owner creates payment patient');

set local request.jwt.claim.sub = '14000000-0000-0000-0000-000000000002';
select lives_ok($$select public.create_payment((select id from public.patients where first_name='Pay'),35000,'cash','paid',(now() at time zone 'America/Guatemala')::date,'REC-001')$$,'assistant records paid payment');
select results_eq($$select amount_centavos from public.payments where external_reference='REC-001'$$,array[35000],'amount is stored as integer centavos');
select results_eq($$select (paid_at at time zone 'America/Guatemala')::date from public.payments where external_reference='REC-001'$$,array[(now() at time zone 'America/Guatemala')::date],'payment date uses clinic timezone');
select lives_ok($$select public.create_payment((select id from public.patients where first_name='Pay'),20000,'transfer','pending',(now() at time zone 'America/Guatemala')::date,'REC-002')$$,'assistant records pending payment');
select throws_ok($$select public.create_payment((select id from public.patients where first_name='Pay'),10000,'cash','paid',(now() at time zone 'America/Guatemala')::date+1,'FUTURE')$$,'P0001','Paid date cannot be in the future','future paid date is rejected');
select results_eq($$select sum(amount_centavos)::bigint from public.payments where status='paid'$$,array[35000::bigint],'paid total excludes pending payment');
select lives_ok($$select public.change_payment_status((select id from public.payments where external_reference='REC-002'),'paid')$$,'pending payment can be paid');
select results_eq($$select sum(amount_centavos)::bigint from public.payments where status='paid'$$,array[55000::bigint],'paid total includes newly paid payment');
select throws_ok($$select public.change_payment_status((select id from public.payments where external_reference='REC-001'),'voided')$$,'P0001','Unsupported payment status transition','paid payment cannot be voided');
select lives_ok($$select public.change_payment_status((select id from public.payments where external_reference='REC-001'),'refunded')$$,'paid payment can be refunded');
select results_eq($$select sum(amount_centavos)::bigint from public.payments where status='paid'$$,array[20000::bigint],'refunded payment is excluded from paid total');
select throws_ok($$select public.change_payment_status((select id from public.payments where external_reference='REC-001'),'paid')$$,'P0001','Final payment status cannot be changed','refund is terminal');
select results_eq($$select count(*) from public.list_payments_for_local_month('24000000-0000-0000-0000-000000000001',(now() at time zone 'America/Guatemala')::date)$$,array[2::bigint],'monthly report uses organization scope');

set local request.jwt.claim.sub = '14000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.payments$$,array[0::bigint],'outsider cannot read payments');
select results_eq($$select count(*) from public.list_payments_for_local_month('24000000-0000-0000-0000-000000000001',(now() at time zone 'America/Guatemala')::date)$$,array[0::bigint],'outsider cannot read monthly report');

select * from finish();
rollback;
