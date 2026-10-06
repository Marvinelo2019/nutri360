begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

select has_table('public','packages','package definitions table exists');
select has_table('public','patient_packages','patient package purchases table exists');
select has_table('public','package_usages','package usage ledger exists');
select has_type('public','patient_package_status','patient package status enum exists');
select has_type('public','package_usage_kind','package usage kind enum exists');
select ok((select relrowsecurity from pg_class where oid='public.packages'::regclass),'packages has RLS');
select ok((select relrowsecurity from pg_class where oid='public.patient_packages'::regclass),'patient packages has RLS');
select ok((select relrowsecurity from pg_class where oid='public.package_usages'::regclass),'package usages has RLS');

insert into auth.users (
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('1c000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','package-owner@test.local','',now(),'{}','{"full_name":"Package Owner"}',now(),now()),
('1c000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','package-assistant@test.local','',now(),'{}','{"full_name":"Package Assistant"}',now(),now()),
('1c000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','package-outsider@test.local','',now(),'{}','{"full_name":"Package Outsider"}',now(),now());
insert into public.organizations (id,name,slug,created_by) values
('2c000000-0000-4000-8000-000000000001','Package Clinic','package-clinic','1c000000-0000-0000-0000-000000000001');
insert into public.organization_memberships (organization_id,user_id,role,status) values
('2c000000-0000-4000-8000-000000000001','1c000000-0000-0000-0000-000000000001','owner','active'),
('2c000000-0000-4000-8000-000000000001','1c000000-0000-0000-0000-000000000002','assistant','active');

set local role authenticated;
set local request.jwt.claim.sub='1c000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.create_patient(
    '2c000000-0000-4000-8000-000000000001','Package','Patient','1990-01-01',
    'female',null,null,null,null,true
  )$$,
  'owner creates package patient'
);
select lives_ok(
  $$select public.create_package_definition(
    '2c000000-0000-4000-8000-000000000001','Seguimiento 2',2,50000,30
  )$$,
  'owner creates package definition'
);
select lives_ok(
  $$select public.create_package_definition(
    '2c000000-0000-4000-8000-000000000001','Vencido',1,10000,1
  )$$,
  'owner creates short package definition'
);

set local request.jwt.claim.sub='1c000000-0000-0000-0000-000000000002';
select lives_ok(
  $$select public.sell_patient_package(
    (select id from public.patients where first_name='Package'),
    (select id from public.packages where name='Seguimiento 2'),
    current_date,true,'transfer','paid','PKG-001'
  )$$,
  'assistant sells a paid patient package'
);
select results_eq(
  $$select package_name_snapshot||'|'||total_sessions||'|'||price_centavos
    from public.patient_packages where package_name_snapshot='Seguimiento 2'$$,
  array['Seguimiento 2|2|50000'::text],
  'purchase snapshots package commercial terms'
);
select results_eq(
  $$select count(*) from public.payments
    where patient_package_id=(select id from public.patient_packages where package_name_snapshot='Seguimiento 2')
      and status='paid' and amount_centavos=50000$$,
  array[1::bigint],
  'sale creates one linked payment'
);
select lives_ok(
  $$select public.set_package_active(
    (select id from public.packages where name='Seguimiento 2'),false
  )$$,
  'assistant can archive a definition after sale'
);
select results_eq(
  $$select package_name_snapshot||'|'||total_sessions||'|'||price_centavos
    from public.patient_packages where package_name_snapshot='Seguimiento 2'$$,
  array['Seguimiento 2|2|50000'::text],
  'archiving definition does not alter purchase snapshot'
);

select lives_ok(
  format(
    $test$select public.create_appointment(
      (select id from public.patients where first_name='Package'),
      '1c000000-0000-0000-0000-000000000001','%s 08:00',30,'in_person'
    )$test$,current_date+2
  ),
  'assistant creates first package appointment'
);
select lives_ok(
  format(
    $test$select public.create_appointment(
      (select id from public.patients where first_name='Package'),
      '1c000000-0000-0000-0000-000000000001','%s 09:00',30,'in_person'
    )$test$,current_date+2
  ),
  'assistant creates second package appointment'
);
select lives_ok(
  format(
    $test$select public.create_appointment(
      (select id from public.patients where first_name='Package'),
      '1c000000-0000-0000-0000-000000000001','%s 10:00',30,'in_person'
    )$test$,current_date+2
  ),
  'assistant creates third package appointment'
);
select lives_ok(
  format(
    $test$select public.create_appointment(
      (select id from public.patients where first_name='Package'),
      '1c000000-0000-0000-0000-000000000001','%s 11:00',30,'in_person'
    )$test$,current_date+2
  ),
  'assistant creates fourth package appointment'
);
select lives_ok(
  $$select public.change_appointment_status(id,'completed')
    from public.appointments where patient_id=(select id from public.patients where first_name='Package')$$,
  'assistant completes package appointments'
);
select lives_ok(
  $$select public.consume_package_session(
    (select id from public.patient_packages where package_name_snapshot='Seguimiento 2'),
    (select id from public.appointments order by starts_at limit 1)
  )$$,
  'completed appointment consumes one session'
);
select results_eq(
  $$select total_sessions + coalesce(sum(session_delta),0)::integer
    from public.patient_packages left join public.package_usages
      on patient_packages.id=package_usages.patient_package_id
    where patient_packages.package_name_snapshot='Seguimiento 2'
    group by total_sessions$$,
  array[1],
  'ledger derives one remaining session'
);
select throws_ok(
  $$select public.consume_package_session(
    (select id from public.patient_packages where package_name_snapshot='Seguimiento 2'),
    (select id from public.appointments order by starts_at limit 1)
  )$$,
  'P0001','Appointment already consumed a package session',
  'same appointment cannot consume twice'
);
select lives_ok(
  $$select public.reverse_package_session(
    (select id from public.package_usages where kind='consumption' order by created_at limit 1)
  )$$,
  'consumption can be reversed with a compensating entry'
);
select results_eq(
  $$select total_sessions + coalesce(sum(session_delta),0)::integer
    from public.patient_packages left join public.package_usages
      on patient_packages.id=package_usages.patient_package_id
    where patient_packages.package_name_snapshot='Seguimiento 2'
    group by total_sessions$$,
  array[2],
  'reversal restores the derived balance'
);
select throws_ok(
  $$select public.reverse_package_session(
    (select id from public.package_usages where kind='consumption' order by created_at limit 1)
  )$$,
  'P0001','Package consumption is already reversed',
  'consumption cannot be reversed twice'
);
select lives_ok(
  $$select public.consume_package_session(
    (select id from public.patient_packages where package_name_snapshot='Seguimiento 2'),
    (select id from public.appointments order by starts_at limit 1)
  )$$,
  'reversed appointment can be consumed again'
);
select lives_ok(
  $$select public.consume_package_session(
    (select id from public.patient_packages where package_name_snapshot='Seguimiento 2'),
    (select id from public.appointments order by starts_at offset 1 limit 1)
  )$$,
  'second appointment consumes the final session'
);
select throws_ok(
  $$select public.consume_package_session(
    (select id from public.patient_packages where package_name_snapshot='Seguimiento 2'),
    (select id from public.appointments order by starts_at offset 2 limit 1)
  )$$,
  'P0001','Patient package has no remaining sessions',
  'exhausted package rejects another consumption'
);
select lives_ok(
  $$select public.sell_patient_package(
    (select id from public.patients where first_name='Package'),
    (select id from public.packages where name='Vencido'),
    current_date-10,false,'cash','pending',null
  )$$,
  'assistant records a historical package without payment'
);
select throws_ok(
  $$select public.consume_package_session(
    (select id from public.patient_packages where package_name_snapshot='Vencido'),
    (select id from public.appointments order by starts_at offset 3 limit 1)
  )$$,
  'P0001','Appointment is outside package validity',
  'appointment outside validity cannot consume a session'
);
select lives_ok(
  $$select public.cancel_patient_package(
    (select id from public.patient_packages where package_name_snapshot='Vencido')
  )$$,
  'assistant cancels patient package'
);
select throws_ok(
  $$select public.consume_package_session(
    (select id from public.patient_packages where package_name_snapshot='Vencido'),
    (select id from public.appointments order by starts_at offset 3 limit 1)
  )$$,
  'P0001','Patient package is not active',
  'cancelled package rejects consumption'
);

reset role;
select throws_ok(
  $$update public.package_usages set session_delta=1 where kind='consumption'$$,
  'P0001','Package usage ledger is immutable',
  'usage entries cannot be updated'
);

set local role authenticated;
set local request.jwt.claim.sub='1c000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.packages$$,array[0::bigint],'outsider cannot read package definitions');
select results_eq($$select count(*) from public.patient_packages$$,array[0::bigint],'outsider cannot read patient packages');
select results_eq($$select count(*) from public.package_usages$$,array[0::bigint],'outsider cannot read usage ledger');
select throws_ok(
  $$select public.set_package_active(
    (select id from public.packages where name='Seguimiento 2'),true
  )$$,
  'P0001','Package not found',
  'outsider cannot mutate hidden package definition'
);

select * from finish();
rollback;
