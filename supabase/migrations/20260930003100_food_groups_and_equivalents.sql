-- Organization-configurable food groups and immutable equivalent snapshots on plan items.

create table public.food_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  portion_guidance text check (portion_guidance is null or char_length(portion_guidance) <= 300),
  energy_kcal integer not null check (energy_kcal between 0 and 2000),
  protein_g numeric(7,2) not null check (protein_g between 0 and 250),
  carbohydrate_g numeric(7,2) not null check (carbohydrate_g between 0 and 250),
  fat_g numeric(7,2) not null check (fat_g between 0 and 100),
  sort_order smallint not null default 100 check (sort_order between 0 and 1000),
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index food_groups_org_name_key
  on public.food_groups (organization_id, lower(name));
create index food_groups_org_order_idx
  on public.food_groups (organization_id, is_active desc, sort_order, name);

alter table public.meal_plan_items
  add column food_group_id uuid,
  add column food_group_name_snapshot text,
  add column equivalent_count numeric(6,2),
  add column equivalent_energy_kcal integer,
  add column equivalent_protein_g numeric(7,2),
  add column equivalent_carbohydrate_g numeric(7,2),
  add column equivalent_fat_g numeric(7,2),
  add constraint meal_plan_items_food_group_org_fkey
    foreign key (food_group_id, organization_id)
    references public.food_groups (id, organization_id) on delete restrict,
  add constraint meal_plan_items_equivalent_snapshot_check check (
    (
      food_group_id is null
      and food_group_name_snapshot is null
      and equivalent_count is null
      and equivalent_energy_kcal is null
      and equivalent_protein_g is null
      and equivalent_carbohydrate_g is null
      and equivalent_fat_g is null
    ) or (
      food_group_id is not null
      and food_group_name_snapshot is not null
      and equivalent_count between 0.01 and 100
      and equivalent_energy_kcal between 0 and 2000
      and equivalent_protein_g between 0 and 250
      and equivalent_carbohydrate_g between 0 and 250
      and equivalent_fat_g between 0 and 100
    )
  );

create function private.prevent_food_group_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id
    or new.organization_id <> old.organization_id
    or new.created_by <> old.created_by then
    raise exception 'Food group identity cannot be changed';
  end if;
  return new;
end;
$$;

create function private.audit_food_group_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id
  ) values (
    new.organization_id, (select auth.uid()), lower(tg_op), 'food_groups', new.id
  );
  return new;
end;
$$;

create trigger food_groups_set_updated_at
  before update on public.food_groups
  for each row execute procedure private.set_updated_at();
create trigger food_groups_identity_guard
  before update on public.food_groups
  for each row execute procedure private.prevent_food_group_identity_change();
create trigger food_groups_audit
  after insert or update on public.food_groups
  for each row execute procedure private.audit_food_group_change();

alter table public.food_groups enable row level security;
revoke all on table public.food_groups from anon, authenticated;
grant select on table public.food_groups to authenticated;

create policy food_groups_select_clinician
  on public.food_groups for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )));

create function public.create_food_group(
  target_organization_id uuid,
  group_name text,
  group_description text,
  group_portion_guidance text,
  group_energy_kcal integer,
  group_protein_g numeric,
  group_carbohydrate_g numeric,
  group_fat_g numeric,
  group_sort_order smallint
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare created_id uuid;
begin
  if not (select private.has_organization_role(
    target_organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;

  insert into public.food_groups (
    organization_id, name, description, portion_guidance, energy_kcal,
    protein_g, carbohydrate_g, fat_g, sort_order, created_by
  ) values (
    target_organization_id, trim(group_name), nullif(trim(group_description), ''),
    nullif(trim(group_portion_guidance), ''), group_energy_kcal, group_protein_g,
    group_carbohydrate_g, group_fat_g, group_sort_order, (select auth.uid())
  ) returning id into created_id;
  return created_id;
end;
$$;

create function public.update_food_group(
  target_group_id uuid,
  group_name text,
  group_description text,
  group_portion_guidance text,
  group_energy_kcal integer,
  group_protein_g numeric,
  group_carbohydrate_g numeric,
  group_fat_g numeric,
  group_sort_order smallint,
  group_is_active boolean
)
returns void language plpgsql security definer set search_path = '' as $$
declare group_row public.food_groups;
begin
  select * into group_row from public.food_groups where id = target_group_id;
  if group_row.id is null then raise exception 'Food group not found'; end if;
  if not (select private.has_organization_role(
    group_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;

  update public.food_groups set
    name = trim(group_name),
    description = nullif(trim(group_description), ''),
    portion_guidance = nullif(trim(group_portion_guidance), ''),
    energy_kcal = group_energy_kcal,
    protein_g = group_protein_g,
    carbohydrate_g = group_carbohydrate_g,
    fat_g = group_fat_g,
    sort_order = group_sort_order,
    is_active = group_is_active
  where id = target_group_id;
end;
$$;

create function public.add_meal_plan_item_with_equivalent(
  target_meal_id uuid,
  item_food_name text,
  item_quantity numeric,
  item_unit text,
  item_guidance text,
  target_food_group_id uuid,
  item_equivalent_count numeric
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  meal_row public.meal_plan_meals;
  group_row public.food_groups;
  created_item_id uuid;
begin
  select * into meal_row from public.meal_plan_meals where id = target_meal_id;
  if meal_row.id is null then raise exception 'Meal not found'; end if;
  if not (select private.has_meal_plan_role(meal_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;
  if exists (
    select 1 from public.meal_plans
    where id = meal_row.meal_plan_id and status <> 'draft'
  ) then raise exception 'Only draft meal plans can be changed'; end if;

  if (target_food_group_id is null) <> (item_equivalent_count is null) then
    raise exception 'Food group and equivalent count must be provided together';
  end if;
  if target_food_group_id is not null then
    select * into group_row from public.food_groups
    where id = target_food_group_id
      and organization_id = meal_row.organization_id
      and is_active;
    if group_row.id is null then raise exception 'Active food group not found'; end if;
    if item_equivalent_count <= 0 or item_equivalent_count > 100 then
      raise exception 'Equivalent count must be between 0.01 and 100';
    end if;
  end if;

  insert into public.meal_plan_items (
    organization_id, meal_plan_id, meal_id, food_name, quantity, unit, guidance,
    sort_order, created_by, food_group_id, food_group_name_snapshot,
    equivalent_count, equivalent_energy_kcal, equivalent_protein_g,
    equivalent_carbohydrate_g, equivalent_fat_g
  ) values (
    meal_row.organization_id, meal_row.meal_plan_id, meal_row.id,
    trim(item_food_name), item_quantity, trim(item_unit),
    nullif(trim(item_guidance), ''),
    coalesce((select max(sort_order) + 10 from public.meal_plan_items where meal_id = meal_row.id and deleted_at is null), 10),
    (select auth.uid()), target_food_group_id, group_row.name,
    item_equivalent_count, group_row.energy_kcal, group_row.protein_g,
    group_row.carbohydrate_g, group_row.fat_g
  ) returning id into created_item_id;
  return created_item_id;
end;
$$;

create function public.update_meal_plan_item_with_equivalent(
  target_item_id uuid,
  item_food_name text,
  item_quantity numeric,
  item_unit text,
  item_guidance text,
  target_food_group_id uuid,
  item_equivalent_count numeric
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  item_row public.meal_plan_items;
  group_row public.food_groups;
begin
  select * into item_row from public.meal_plan_items
  where id = target_item_id and deleted_at is null;
  if item_row.id is null then raise exception 'Meal plan item not found'; end if;
  if not (select private.has_meal_plan_role(item_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;
  if exists (
    select 1 from public.meal_plans
    where id = item_row.meal_plan_id and status <> 'draft'
  ) then raise exception 'Only draft meal plans can be changed'; end if;

  if (target_food_group_id is null) <> (item_equivalent_count is null) then
    raise exception 'Food group and equivalent count must be provided together';
  end if;
  if target_food_group_id is not null then
    select * into group_row from public.food_groups
    where id = target_food_group_id
      and organization_id = item_row.organization_id
      and is_active;
    if group_row.id is null then raise exception 'Active food group not found'; end if;
    if item_equivalent_count <= 0 or item_equivalent_count > 100 then
      raise exception 'Equivalent count must be between 0.01 and 100';
    end if;
  end if;

  update public.meal_plan_items set
    food_name = trim(item_food_name),
    quantity = item_quantity,
    unit = trim(item_unit),
    guidance = nullif(trim(item_guidance), ''),
    food_group_id = target_food_group_id,
    food_group_name_snapshot = group_row.name,
    equivalent_count = item_equivalent_count,
    equivalent_energy_kcal = group_row.energy_kcal,
    equivalent_protein_g = group_row.protein_g,
    equivalent_carbohydrate_g = group_row.carbohydrate_g,
    equivalent_fat_g = group_row.fat_g
  where id = target_item_id;
end;
$$;

revoke all on function public.create_food_group(uuid,text,text,text,integer,numeric,numeric,numeric,smallint) from public;
revoke all on function public.update_food_group(uuid,text,text,text,integer,numeric,numeric,numeric,smallint,boolean) from public;
revoke all on function public.add_meal_plan_item_with_equivalent(uuid,text,numeric,text,text,uuid,numeric) from public;
revoke all on function public.update_meal_plan_item_with_equivalent(uuid,text,numeric,text,text,uuid,numeric) from public;
grant execute on function public.create_food_group(uuid,text,text,text,integer,numeric,numeric,numeric,smallint) to authenticated;
grant execute on function public.update_food_group(uuid,text,text,text,integer,numeric,numeric,numeric,smallint,boolean) to authenticated;
grant execute on function public.add_meal_plan_item_with_equivalent(uuid,text,numeric,text,text,uuid,numeric) to authenticated;
grant execute on function public.update_meal_plan_item_with_equivalent(uuid,text,numeric,text,text,uuid,numeric) to authenticated;
