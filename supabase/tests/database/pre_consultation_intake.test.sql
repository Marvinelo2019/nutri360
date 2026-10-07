begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

select has_table('public','intake_invites','intake invitations exist');
select has_table('public','intake_submissions','intake submissions exist');
select ok((select relrowsecurity from pg_class where oid='public.intake_invites'::regclass),'intake invitations have RLS');
select ok((select relrowsecurity from pg_class where oid='public.intake_submissions'::regclass),'intake submissions have RLS');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('1c000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','intake-owner@test.local','',now(),'{}','{}',now(),now()),
('1c000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','intake-assistant@test.local','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug,created_by)
values ('2c000000-0000-0000-0000-000000000001','Intake Clinic','intake-clinic','1c000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('2c000000-0000-0000-0000-000000000001','1c000000-0000-0000-0000-000000000001','owner','active'),
('2c000000-0000-0000-0000-000000000001','1c000000-0000-0000-0000-000000000002','assistant','active');

set local role authenticated;
set local request.jwt.claim.sub='1c000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.create_patient('2c000000-0000-0000-0000-000000000001','Preconsulta','Paciente','1990-01-01','female',null,null,null,null,true)$$,
  'owner creates the intake patient'
);
select lives_ok(
  $$select public.create_intake_invite((select id from public.patients where first_name='Preconsulta'),repeat('a',64),now()+interval '7 days')$$,
  'owner creates an expiring invitation'
);
select results_eq($$select count(*) from public.intake_invites where organization_id='2c000000-0000-0000-0000-000000000001'$$,array[1::bigint],'owner reads the invitation');
select throws_ok(
  $$select public.create_intake_invite((select id from public.patients where first_name='Preconsulta'),repeat('b',64),now()+interval '31 days')$$,
  'P0001','Invalid invitation expiry','invitation expiry is bounded'
);

set local request.jwt.claim.sub='1c000000-0000-0000-0000-000000000002';
select results_eq($$select count(*) from public.intake_invites$$,array[0::bigint],'assistant cannot read invitations');
select results_eq($$select count(*) from public.intake_submissions$$,array[0::bigint],'assistant cannot read submissions');
select throws_ok(
  $$select public.create_intake_invite((select id from public.patients where first_name='Preconsulta'),repeat('b',64),now()+interval '7 days')$$,
  'P0001','Clinical role required','assistant cannot create an invitation'
);

reset role;
select ok(not has_table_privilege('anon','public.intake_invites','SELECT'),'anonymous role cannot read invitations');
select ok(not has_table_privilege('anon','public.intake_submissions','SELECT'),'anonymous role cannot read submissions');
select ok(not has_function_privilege('anon','public.get_public_intake_context(text)','EXECUTE'),'anonymous browser cannot call intake context directly');
select ok(not has_function_privilege('authenticated','public.submit_public_intake(text,text,text,text,text,text,text,numeric,numeric,text,text,text,text)','EXECUTE'),'authenticated browser cannot submit through privileged RPC');
select ok(has_function_privilege('service_role','public.submit_public_intake(text,text,text,text,text,text,text,numeric,numeric,text,text,text,text)','EXECUTE'),'service role can call controlled submission RPC');

set local role service_role;
select results_eq(
  $$select organization_name from public.get_public_intake_context(repeat('a',64))$$,
  array['Intake Clinic'::text],
  'active token returns minimal clinic context'
);
select lives_ok(
  $$select public.submit_public_intake(repeat('a',64),'Sin antecedentes','Diabetes','Penicilina','Vitamina D','Avena y fruta','Tres comidas',2.5,8,'Camina','Frutas','Sin lácteos','pre-consultation-v1')$$,
  'valid public intake is submitted once'
);
reset role;
select results_eq(
  $$select submissions.allergies || '|' || submissions.water_liters
    from public.intake_submissions submissions
    join public.intake_invites invites on invites.id=submissions.invite_id
    where invites.token_hash=repeat('a',64)$$,
  array['Penicilina|2.50'::text],
  'submitted answers are stored with explicit units'
);
select results_eq($$select count(*) from public.intake_invites where token_hash=repeat('a',64) and completed_at is not null$$,array[1::bigint],'successful submission completes the invitation');
set local role service_role;
select throws_ok(
  $$select public.submit_public_intake(repeat('a',64),null,null,null,null,null,null,null,null,null,null,null,'pre-consultation-v1')$$,
  'P0001','Intake link unavailable','completed link cannot be reused'
);
select results_eq($$select count(*) from public.get_public_intake_context(repeat('a',64))$$,array[0::bigint],'completed link exposes no context');
reset role;
select throws_ok(
  $$update public.intake_submissions set allergies='Changed'
    where invite_id=(select id from public.intake_invites where token_hash=repeat('a',64))$$,
  'P0001','Intake submissions are immutable','submitted answers cannot be changed'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub='1c000000-0000-0000-0000-000000000001';
select results_eq($$select count(*) from public.intake_submissions where organization_id='2c000000-0000-0000-0000-000000000001'$$,array[1::bigint],'owner can review the submission');
select cmp_ok((select count(*) from public.audit_events where organization_id='2c000000-0000-0000-0000-000000000001' and entity_type='intake_invites'),'=',2::bigint,'invitation creation and completion are audited');
select results_eq($$select count(*) from public.audit_events where organization_id='2c000000-0000-0000-0000-000000000001' and entity_type='intake_submissions'$$,array[1::bigint],'submission creation is audited without answers');
select lives_ok(
  $$select public.create_intake_invite((select id from public.patients where first_name='Preconsulta'),repeat('c',64),now()+interval '7 days')$$,
  'owner creates a replacement invitation'
);
select lives_ok(
  $$select public.revoke_intake_invite((select id from public.intake_invites where token_hash=repeat('c',64)))$$,
  'owner revokes an unused invitation'
);

reset role;
set local role service_role;
select results_eq($$select count(*) from public.get_public_intake_context(repeat('c',64))$$,array[0::bigint],'revoked link exposes no context');
select throws_ok(
  $$select public.submit_public_intake(repeat('c',64),null,null,null,null,null,null,null,null,null,null,null,'pre-consultation-v1')$$,
  'P0001','Intake link unavailable','revoked link cannot be submitted'
);

select * from finish();
rollback;
