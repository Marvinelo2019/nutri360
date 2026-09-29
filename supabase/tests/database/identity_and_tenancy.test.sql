begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'organizations', 'organizations table exists');
select has_table(
  'public',
  'organization_memberships',
  'organization memberships table exists'
);
select has_table('public', 'audit_events', 'audit events table exists');
select has_type('public', 'app_role', 'application role enum exists');
select has_type(
  'public',
  'membership_status',
  'membership status enum exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  'organizations has RLS enabled'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.organization_memberships'::regclass
  ),
  'organization memberships has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass),
  'audit events has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.organizations', 'select'),
  'anonymous users cannot select organizations'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner@nutri360.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Owner Test"}',
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'nutritionist@nutri360.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Nutritionist Test"}',
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'outsider@nutri360.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Outsider Test"}',
    now(),
    now()
  );

insert into public.organizations (id, name, slug, created_by)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'Owner Clinic',
    'owner-clinic',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Outsider Clinic',
    'outsider-clinic',
    '10000000-0000-0000-0000-000000000003'
  );

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'nutritionist',
    'active'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    'owner',
    'active'
  );

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.create_organization('Bootstrap Clinic', 'bootstrap-clinic')$$,
  'an authenticated user can bootstrap an organization'
);
select results_eq(
  $$
    select count(*)
    from public.organization_memberships as membership
    join public.organizations as organization
      on organization.id = membership.organization_id
    where organization.slug = 'bootstrap-clinic'
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
      and membership.status = 'active'
  $$,
  array[1::bigint],
  'organization bootstrap creates its first active owner'
);
select results_eq(
  $$select count(*) from public.organizations where slug = 'owner-clinic'$$,
  array[1::bigint],
  'an owner can read their organization'
);
select lives_ok(
  $$update public.organizations set name = 'Owner Clinic Updated' where slug = 'owner-clinic'$$,
  'an owner can update their organization'
);
select throws_ok(
  $$
    update public.organization_memberships
    set role = 'assistant'
    where organization_id = '20000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000001'
  $$,
  'P0001',
  'An organization must retain at least one active owner',
  'the final active owner cannot be demoted'
);

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

select results_eq(
  $$select count(*) from public.organizations where slug = 'owner-clinic'$$,
  array[0::bigint],
  'a non-member cannot read another organization'
);
select is_empty(
  $$update public.organizations set name = 'Unauthorized' where slug = 'owner-clinic' returning id$$,
  'a non-member cannot update another organization'
);

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

select results_eq(
  $$
    select count(*)
    from public.organization_memberships
    where organization_id = '20000000-0000-0000-0000-000000000001'
  $$,
  array[2::bigint],
  'a nutritionist can read the membership directory'
);
select is_empty(
  $$update public.organizations set name = 'Unauthorized' where slug = 'owner-clinic' returning id$$,
  'a nutritionist cannot administer the organization'
);

select * from finish();

rollback;
