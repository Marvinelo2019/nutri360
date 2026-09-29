-- Nutri360 foundation: identities, organizations, memberships, audit, and RLS.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.app_role as enum (
  'owner',
  'nutritionist',
  'assistant',
  'patient'
);

create type public.membership_status as enum (
  'invited',
  'active',
  'suspended'
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  locale text not null default 'es-GT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_path text,
  brand_color text not null default '#2D6A4F' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  timezone text not null default 'America/Guatemala',
  currency text not null default 'GTQ' check (currency ~ '^[A-Z]{3}$'),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index organizations_active_slug_key
  on public.organizations (slug)
  where deleted_at is null;

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_memberships_user_active_idx
  on public.organization_memberships (user_id, organization_id)
  where status = 'active';

create index organization_memberships_org_role_idx
  on public.organization_memberships (organization_id, role)
  where status = 'active';

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 2 and 80),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index audit_events_org_created_idx
  on public.audit_events (organization_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.current_user_organization_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select membership.organization_id
  from public.organization_memberships as membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active';
$$;

create function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any (allowed_roles)
  );
$$;

create function private.organization_has_members(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = target_organization_id
  );
$$;

create function private.is_organization_creator(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.organizations as organization
    where organization.id = target_organization_id
      and organization.created_by = (select auth.uid())
  );
$$;

create function private.can_view_profile(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select target_user_id = (select auth.uid()) or exists (
    select 1
    from public.organization_memberships as viewer
    join public.organization_memberships as target
      on target.organization_id = viewer.organization_id
    where viewer.user_id = (select auth.uid())
      and viewer.status = 'active'
      and viewer.role in ('owner', 'nutritionist', 'assistant')
      and target.user_id = target_user_id
      and target.status = 'active'
  );
$$;

revoke all on function private.current_user_organization_ids() from public;
revoke all on function private.has_organization_role(uuid, public.app_role[]) from public;
revoke all on function private.organization_has_members(uuid) from public;
revoke all on function private.is_organization_creator(uuid) from public;
revoke all on function private.can_view_profile(uuid) from public;
grant execute on function private.current_user_organization_ids() to authenticated;
grant execute on function private.has_organization_role(uuid, public.app_role[]) to authenticated;
grant execute on function private.organization_has_members(uuid) to authenticated;
grant execute on function private.is_organization_creator(uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, phone_e164)
  values (
    new.id,
    case
      when char_length(trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''))) between 2 and 120
        then trim(new.raw_user_meta_data ->> 'full_name')
      when char_length(split_part(coalesce(new.email, new.phone, ''), '@', 1)) between 2 and 120
        then split_part(coalesce(new.email, new.phone, ''), '@', 1)
      else 'Usuario ' || left(new.id::text, 8)
    end,
    case
      when coalesce(new.phone, '') ~ '^\+[1-9][0-9]{7,14}$' then new.phone
      else null
    end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

create function private.prevent_membership_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id or new.user_id <> old.user_id then
    raise exception 'Membership organization and user cannot be changed';
  end if;

  return new;
end;
$$;

create function private.prevent_organization_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.created_by <> old.created_by then
    raise exception 'Organization identity and creator cannot be changed';
  end if;

  return new;
end;
$$;

create function private.protect_last_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  removes_active_owner boolean;
begin
  if tg_op = 'DELETE' then
    removes_active_owner := old.role = 'owner' and old.status = 'active';
  else
    removes_active_owner := old.role = 'owner'
      and old.status = 'active'
      and (new.role <> 'owner' or new.status <> 'active');
  end if;

  if removes_active_owner and not exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = old.organization_id
      and membership.id <> old.id
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    raise exception 'An organization must retain at least one active owner';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function private.audit_organization_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  target_entity_id uuid;
begin
  if tg_table_name = 'organizations' then
    target_organization_id := coalesce(new.id, old.id);
  else
    target_organization_id := coalesce(new.organization_id, old.organization_id);
  end if;

  target_entity_id := coalesce(new.id, old.id);

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id
  ) values (
    target_organization_id,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    target_entity_id
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure private.set_updated_at();

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute procedure private.set_updated_at();

create trigger organizations_identity_guard
  before update on public.organizations
  for each row execute procedure private.prevent_organization_identity_change();

create trigger organization_memberships_set_updated_at
  before update on public.organization_memberships
  for each row execute procedure private.set_updated_at();

create trigger organization_memberships_identity_guard
  before update on public.organization_memberships
  for each row execute procedure private.prevent_membership_identity_change();

create trigger organization_memberships_last_owner_guard
  before update or delete on public.organization_memberships
  for each row execute procedure private.protect_last_owner();

create trigger organizations_audit
  after insert or update on public.organizations
  for each row execute procedure private.audit_organization_change();

create trigger organization_memberships_audit
  after insert or update or delete on public.organization_memberships
  for each row execute procedure private.audit_organization_change();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_memberships from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, phone_e164, locale)
  on table public.profiles to authenticated;

grant select on table public.organizations to authenticated;
grant insert (
  name,
  slug,
  logo_path,
  brand_color,
  phone_e164,
  timezone,
  currency,
  created_by
) on table public.organizations to authenticated;
grant update (
  name,
  slug,
  logo_path,
  brand_color,
  phone_e164,
  timezone,
  currency,
  deleted_at
) on table public.organizations to authenticated;

grant select, delete on table public.organization_memberships to authenticated;
grant insert (organization_id, user_id, role, status, invited_by)
  on table public.organization_memberships to authenticated;
grant update (role, status, invited_by)
  on table public.organization_memberships to authenticated;

grant select on table public.audit_events to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select private.can_view_profile(user_id))
  );

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy organizations_select_member_or_bootstrap_creator
  on public.organizations
  for select
  to authenticated
  using (
    id in (select private.current_user_organization_ids())
    or (
      created_by = (select auth.uid())
      and not (select private.organization_has_members(id))
    )
  );

create policy organizations_insert_creator
  on public.organizations
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and created_by = (select auth.uid())
  );

create policy organizations_update_owner
  on public.organizations
  for update
  to authenticated
  using ((select private.has_organization_role(id, array['owner']::public.app_role[])))
  with check ((select private.has_organization_role(id, array['owner']::public.app_role[])));

create policy memberships_select_member
  on public.organization_memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      organization_id in (select private.current_user_organization_ids())
      and (select private.has_organization_role(
        organization_id,
        array['owner', 'nutritionist', 'assistant']::public.app_role[]
      ))
    )
  );

create policy memberships_insert_owner_or_bootstrap
  on public.organization_memberships
  for insert
  to authenticated
  with check (
    (select private.has_organization_role(organization_id, array['owner']::public.app_role[]))
    or (
      user_id = (select auth.uid())
      and role = 'owner'
      and status = 'active'
      and not (select private.organization_has_members(organization_id))
      and (select private.is_organization_creator(organization_id))
    )
  );

create policy memberships_update_owner
  on public.organization_memberships
  for update
  to authenticated
  using ((select private.has_organization_role(organization_id, array['owner']::public.app_role[])))
  with check ((select private.has_organization_role(organization_id, array['owner']::public.app_role[])));

create policy memberships_delete_owner
  on public.organization_memberships
  for delete
  to authenticated
  using ((select private.has_organization_role(organization_id, array['owner']::public.app_role[])));

create policy audit_events_select_owner
  on public.audit_events
  for select
  to authenticated
  using ((select private.has_organization_role(organization_id, array['owner']::public.app_role[])));

create function public.create_organization(
  organization_name text,
  organization_slug text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_organization_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(organization_name)) not between 2 and 120 then
    raise exception 'Organization name must contain between 2 and 120 characters';
  end if;

  if organization_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Organization slug is invalid';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(organization_name), organization_slug, (select auth.uid()))
  returning id into created_organization_id;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role,
    status
  ) values (
    created_organization_id,
    (select auth.uid()),
    'owner',
    'active'
  );

  return created_organization_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

comment on function public.create_organization(text, text) is
  'Atomically creates an organization and its first active owner using caller RLS permissions.';
