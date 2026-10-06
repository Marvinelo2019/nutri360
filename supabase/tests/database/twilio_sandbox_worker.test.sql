begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_function(
  'public',
  'claim_due_twilio_sandbox_reminders',
  array['uuid','text','integer','text'],
  'sandbox claim function exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_due_twilio_sandbox_reminders(uuid,text,integer,text)',
    'execute'
  ),
  'browser roles cannot claim sandbox reminders'
);

insert into auth.users (
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '1b000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  'sandbox-owner@test.local','',now(),'{}','{"full_name":"Sandbox Owner"}',now(),now()
);
insert into public.organizations (id,name,slug,created_by) values (
  '2b000000-0000-4000-8000-000000000001','Sandbox Clinic','sandbox-clinic',
  '1b000000-0000-0000-0000-000000000001'
);
insert into public.organization_memberships (organization_id,user_id,role,status)
values (
  '2b000000-0000-4000-8000-000000000001',
  '1b000000-0000-0000-0000-000000000001','owner','active'
);

set local role authenticated;
set local request.jwt.claim.sub='1b000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.create_patient(
    '2b000000-0000-4000-8000-000000000001','Sandbox','Recipient','1990-01-01',
    'female','+50255550155',null,null,null,true
  )$$,
  'owner creates allowlisted test patient'
);
select lives_ok(
  format(
    $test$select public.create_appointment(
      (select id from public.patients where first_name='Sandbox'),
      '1b000000-0000-0000-0000-000000000001','%s 10:00',60,'in_person'
    )$test$,
    current_date + 2
  ),
  'future appointment creates due confirmation'
);

set local role service_role;
select results_eq(
  $$select count(*) from public.claim_due_twilio_sandbox_reminders(
    '2b000000-0000-4000-8000-000000000001','+50255550999',1,'sandbox-wrong'
  )$$,
  array[0::bigint],
  'a different recipient cannot claim the reminder'
);
create temporary table sandbox_claim on commit drop as
select * from public.claim_due_twilio_sandbox_reminders(
  '2b000000-0000-4000-8000-000000000001','+50255550155',1,'sandbox-worker'
);
select results_eq(
  $$select count(*) from sandbox_claim$$,
  array[1::bigint],
  'allowlisted recipient claims one reminder'
);
select results_eq(
  $$select recipient_phone_e164 from sandbox_claim$$,
  array['+50255550155'::text],
  'claim returns only the configured recipient'
);
select results_eq(
  $$select count(*) from public.claim_due_twilio_sandbox_reminders(
    '2b000000-0000-4000-8000-000000000001','+50255550155',1,'sandbox-worker-2'
  )$$,
  array[0::bigint],
  'active lease prevents a duplicate sandbox send'
);
select lives_ok(
  $$select public.complete_appointment_reminder(
    (select reminder_id from sandbox_claim),'sandbox-worker','sent',
    'twilio_sandbox','SM123456789',''
  )$$,
  'sandbox delivery records provider acceptance'
);
select results_eq(
  $$select status::text||'|'||provider_message_id
    from public.appointment_reminders
    where id=(select reminder_id from sandbox_claim)$$,
  array['sent|SM123456789'::text],
  'accepted message keeps the Twilio SID'
);

select * from finish();
rollback;
