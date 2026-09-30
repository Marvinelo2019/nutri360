-- Structured clinical meal plans.

create type public.meal_plan_status as enum ('draft', 'active', 'archived');

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  status public.meal_plan_status not null default 'draft',
  starts_on date,
  ends_on date,
  target_energy_kcal integer check (target_energy_kcal is null or target_energy_kcal between 500 and 8000),
  target_protein_g numeric(7,2) check (target_protein_g is null or target_protein_g between 0 and 1000),
  target_carbohydrate_g numeric(7,2) check (target_carbohydrate_g is null or target_carbohydrate_g between 0 and 1500),
  target_fat_g numeric(7,2) check (target_fat_g is null or target_fat_g between 0 and 500),
  instructions text check (instructions is null or char_length(instructions) <= 4000),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict
);

create unique index meal_plans_one_active_per_patient
  on public.meal_plans (patient_id) where status = 'active';
create index meal_plans_org_status_idx
  on public.meal_plans (organization_id, status, updated_at desc);
alter table public.meal_plans add constraint meal_plans_id_org_key unique (id, organization_id);

create table public.meal_plan_meals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  meal_plan_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  suggested_time time,
  sort_order smallint not null check (sort_order between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (meal_plan_id, organization_id)
    references public.meal_plans (id, organization_id) on delete restrict
);
create index meal_plan_meals_plan_order_idx
  on public.meal_plan_meals (meal_plan_id, sort_order);
alter table public.meal_plan_meals add constraint meal_plan_meals_id_org_plan_key
  unique (id, organization_id, meal_plan_id);

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  meal_plan_id uuid not null,
  meal_id uuid not null,
  food_name text not null check (char_length(food_name) between 1 and 160),
  quantity numeric(8,2) not null check (quantity > 0 and quantity <= 10000),
  unit text not null check (char_length(unit) between 1 and 40),
  guidance text check (guidance is null or char_length(guidance) <= 500),
  sort_order smallint not null default 0 check (sort_order between 0 and 1000),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (meal_id, organization_id, meal_plan_id)
    references public.meal_plan_meals (id, organization_id, meal_plan_id) on delete restrict
);
create index meal_plan_items_meal_order_idx
  on public.meal_plan_items (meal_id, sort_order, created_at) where deleted_at is null;

create function private.has_meal_plan_role(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.has_organization_role(
    target_organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  );
$$;
revoke all on function private.has_meal_plan_role(uuid) from public;
grant execute on function private.has_meal_plan_role(uuid) to authenticated;

create function private.prevent_meal_plan_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.organization_id <> old.organization_id
    or new.patient_id <> old.patient_id or new.created_by <> old.created_by then
    raise exception 'Meal plan identity cannot be changed';
  end if;
  return new;
end;
$$;

create function private.audit_meal_plan_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_plan_id uuid;
  target_record_id uuid;
begin
  target_plan_id := coalesce((to_jsonb(new)->>'meal_plan_id')::uuid, (to_jsonb(old)->>'meal_plan_id')::uuid, new.id, old.id);
  target_record_id := coalesce(new.id, old.id);
  insert into public.audit_events (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    coalesce(new.organization_id, old.organization_id), (select auth.uid()), lower(tg_op),
    tg_table_name, target_plan_id, jsonb_build_object('record_id', target_record_id)
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger meal_plans_set_updated_at before update on public.meal_plans
  for each row execute procedure private.set_updated_at();
create trigger meal_plans_identity_guard before update on public.meal_plans
  for each row execute procedure private.prevent_meal_plan_identity_change();
create trigger meal_plans_audit after insert or update on public.meal_plans
  for each row execute procedure private.audit_meal_plan_change();
create trigger meal_plan_items_audit after insert or update on public.meal_plan_items
  for each row execute procedure private.audit_meal_plan_change();

alter table public.meal_plans enable row level security;
alter table public.meal_plan_meals enable row level security;
alter table public.meal_plan_items enable row level security;
revoke all on table public.meal_plans from anon, authenticated;
revoke all on table public.meal_plan_meals from anon, authenticated;
revoke all on table public.meal_plan_items from anon, authenticated;
grant select on table public.meal_plans to authenticated;
grant select on table public.meal_plan_meals to authenticated;
grant select on table public.meal_plan_items to authenticated;

create policy meal_plans_select_clinician on public.meal_plans for select to authenticated
  using ((select private.has_meal_plan_role(organization_id)));
create policy meal_plan_meals_select_clinician on public.meal_plan_meals for select to authenticated
  using ((select private.has_meal_plan_role(organization_id)));
create policy meal_plan_items_select_clinician on public.meal_plan_items for select to authenticated
  using (deleted_at is null and (select private.has_meal_plan_role(organization_id)));

create function public.create_meal_plan(
  target_patient_id uuid,
  plan_name text,
  plan_starts_on date,
  plan_ends_on date,
  energy_kcal integer,
  protein_g numeric,
  carbohydrate_g numeric,
  fat_g numeric,
  plan_instructions text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_row public.patients;
  created_plan_id uuid;
begin
  select * into patient_row from public.patients where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_meal_plan_role(patient_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;

  insert into public.meal_plans (
    organization_id, patient_id, name, starts_on, ends_on, target_energy_kcal,
    target_protein_g, target_carbohydrate_g, target_fat_g, instructions, created_by
  ) values (
    patient_row.organization_id, patient_row.id, trim(plan_name), plan_starts_on,
    plan_ends_on, energy_kcal, protein_g, carbohydrate_g, fat_g,
    nullif(trim(plan_instructions), ''), (select auth.uid())
  ) returning id into created_plan_id;

  insert into public.meal_plan_meals (organization_id, meal_plan_id, name, suggested_time, sort_order)
  values
    (patient_row.organization_id, created_plan_id, 'Desayuno', '07:00', 10),
    (patient_row.organization_id, created_plan_id, 'Refacción de la mañana', '10:00', 20),
    (patient_row.organization_id, created_plan_id, 'Almuerzo', '13:00', 30),
    (patient_row.organization_id, created_plan_id, 'Refacción de la tarde', '16:00', 40),
    (patient_row.organization_id, created_plan_id, 'Cena', '19:00', 50);
  return created_plan_id;
end;
$$;

create function public.add_meal_plan_item(
  target_meal_id uuid,
  item_food_name text,
  item_quantity numeric,
  item_unit text,
  item_guidance text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  meal_row public.meal_plan_meals;
  created_item_id uuid;
begin
  select * into meal_row from public.meal_plan_meals where id = target_meal_id;
  if meal_row.id is null then raise exception 'Meal not found'; end if;
  if not (select private.has_meal_plan_role(meal_row.organization_id)) then raise exception 'Clinical role required'; end if;
  if exists (select 1 from public.meal_plans where id = meal_row.meal_plan_id and status <> 'draft') then
    raise exception 'Only draft meal plans can be changed';
  end if;
  insert into public.meal_plan_items (
    organization_id, meal_plan_id, meal_id, food_name, quantity, unit, guidance, sort_order, created_by
  ) values (
    meal_row.organization_id, meal_row.meal_plan_id, meal_row.id, trim(item_food_name),
    item_quantity, trim(item_unit), nullif(trim(item_guidance), ''),
    coalesce((select max(sort_order) + 10 from public.meal_plan_items where meal_id = meal_row.id and deleted_at is null), 10),
    (select auth.uid())
  ) returning id into created_item_id;
  return created_item_id;
end;
$$;

create function public.remove_meal_plan_item(target_item_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  item_row public.meal_plan_items;
begin
  select * into item_row from public.meal_plan_items where id = target_item_id and deleted_at is null;
  if item_row.id is null then raise exception 'Meal plan item not found'; end if;
  if not (select private.has_meal_plan_role(item_row.organization_id)) then raise exception 'Clinical role required'; end if;
  if exists (select 1 from public.meal_plans where id = item_row.meal_plan_id and status <> 'draft') then
    raise exception 'Only draft meal plans can be changed';
  end if;
  update public.meal_plan_items set deleted_at = now() where id = target_item_id;
end;
$$;

create function public.change_meal_plan_status(target_plan_id uuid, next_status public.meal_plan_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  plan_row public.meal_plans;
begin
  select * into plan_row from public.meal_plans where id = target_plan_id;
  if plan_row.id is null then raise exception 'Meal plan not found'; end if;
  if not (select private.has_meal_plan_role(plan_row.organization_id)) then raise exception 'Clinical role required'; end if;
  if plan_row.status = 'archived' then raise exception 'Archived meal plan status cannot be changed'; end if;
  if next_status not in ('active', 'archived') then raise exception 'Unsupported meal plan status transition'; end if;
  if next_status = 'active' then
    if not exists (select 1 from public.meal_plan_items where meal_plan_id = target_plan_id and deleted_at is null) then
      raise exception 'Meal plan needs at least one item before activation';
    end if;
    update public.meal_plans set status = 'archived'
    where patient_id = plan_row.patient_id and status = 'active' and id <> target_plan_id;
  end if;
  update public.meal_plans set status = next_status where id = target_plan_id;
end;
$$;

create function public.record_meal_plan_read(target_plan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  plan_row public.meal_plans;
begin
  select * into plan_row from public.meal_plans where id = target_plan_id;
  if plan_row.id is null then raise exception 'Meal plan not found'; end if;
  if not (select private.has_meal_plan_role(plan_row.organization_id)) then raise exception 'Clinical role required'; end if;
  insert into public.audit_events (organization_id, actor_user_id, action, entity_type, entity_id)
  values (plan_row.organization_id, (select auth.uid()), 'read', 'meal_plans', plan_row.id);
end;
$$;

revoke all on function public.create_meal_plan(uuid,text,date,date,integer,numeric,numeric,numeric,text) from public;
revoke all on function public.add_meal_plan_item(uuid,text,numeric,text,text) from public;
revoke all on function public.remove_meal_plan_item(uuid) from public;
revoke all on function public.change_meal_plan_status(uuid,public.meal_plan_status) from public;
revoke all on function public.record_meal_plan_read(uuid) from public;
grant execute on function public.create_meal_plan(uuid,text,date,date,integer,numeric,numeric,numeric,text) to authenticated;
grant execute on function public.add_meal_plan_item(uuid,text,numeric,text,text) to authenticated;
grant execute on function public.remove_meal_plan_item(uuid) to authenticated;
grant execute on function public.change_meal_plan_status(uuid,public.meal_plan_status) to authenticated;
grant execute on function public.record_meal_plan_read(uuid) to authenticated;
