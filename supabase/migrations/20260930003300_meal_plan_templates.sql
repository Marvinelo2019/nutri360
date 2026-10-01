-- Organization-owned reusable meal-plan snapshots.

create table public.meal_plan_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  source_plan_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  category text check (category is null or char_length(category) <= 80),
  description text check (description is null or char_length(description) <= 500),
  target_energy_kcal integer check (target_energy_kcal is null or target_energy_kcal between 500 and 8000),
  target_protein_g numeric(7,2) check (target_protein_g is null or target_protein_g between 0 and 1000),
  target_carbohydrate_g numeric(7,2) check (target_carbohydrate_g is null or target_carbohydrate_g between 0 and 1500),
  target_fat_g numeric(7,2) check (target_fat_g is null or target_fat_g between 0 and 500),
  instructions text check (instructions is null or char_length(instructions) <= 4000),
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_plan_id, organization_id)
    references public.meal_plans (id, organization_id) on delete restrict,
  unique (id, organization_id)
);

create unique index meal_plan_templates_active_name_key
  on public.meal_plan_templates (organization_id, lower(name))
  where is_active;
create index meal_plan_templates_org_active_idx
  on public.meal_plan_templates (organization_id, is_active desc, updated_at desc);

create table public.meal_plan_template_meals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  template_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  suggested_time time,
  sort_order smallint not null check (sort_order between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (template_id, organization_id)
    references public.meal_plan_templates (id, organization_id) on delete restrict,
  unique (id, organization_id, template_id)
);

create index meal_plan_template_meals_order_idx
  on public.meal_plan_template_meals (template_id, sort_order);

create table public.meal_plan_template_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  template_id uuid not null,
  template_meal_id uuid not null,
  food_name text not null check (char_length(food_name) between 1 and 160),
  quantity numeric(8,2) not null check (quantity > 0 and quantity <= 10000),
  unit text not null check (char_length(unit) between 1 and 40),
  guidance text check (guidance is null or char_length(guidance) <= 500),
  sort_order smallint not null check (sort_order between 0 and 1000),
  food_group_id uuid,
  food_group_name_snapshot text,
  equivalent_count numeric(6,2),
  equivalent_energy_kcal integer,
  equivalent_protein_g numeric(7,2),
  equivalent_carbohydrate_g numeric(7,2),
  equivalent_fat_g numeric(7,2),
  created_at timestamptz not null default now(),
  foreign key (template_meal_id, organization_id, template_id)
    references public.meal_plan_template_meals (id, organization_id, template_id) on delete restrict,
  foreign key (food_group_id, organization_id)
    references public.food_groups (id, organization_id) on delete restrict,
  check (
    (
      food_group_id is null and food_group_name_snapshot is null
      and equivalent_count is null and equivalent_energy_kcal is null
      and equivalent_protein_g is null and equivalent_carbohydrate_g is null
      and equivalent_fat_g is null
    ) or (
      food_group_id is not null and food_group_name_snapshot is not null
      and equivalent_count between 0.01 and 100
      and equivalent_energy_kcal between 0 and 2000
      and equivalent_protein_g between 0 and 250
      and equivalent_carbohydrate_g between 0 and 250
      and equivalent_fat_g between 0 and 100
    )
  )
);

create index meal_plan_template_items_order_idx
  on public.meal_plan_template_items (template_meal_id, sort_order, created_at);

create function private.prevent_meal_plan_template_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.organization_id <> old.organization_id
    or new.source_plan_id <> old.source_plan_id
    or new.created_by <> old.created_by then
    raise exception 'Meal plan template identity cannot be changed';
  end if;
  return new;
end;
$$;

create function private.audit_meal_plan_template_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_template_id uuid;
begin
  target_template_id := coalesce(
    (row_data ->> 'template_id')::uuid,
    (row_data ->> 'id')::uuid
  );
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id
  ) values (
    (row_data ->> 'organization_id')::uuid, (select auth.uid()),
    lower(tg_op), tg_table_name, target_template_id
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger meal_plan_templates_set_updated_at
  before update on public.meal_plan_templates
  for each row execute procedure private.set_updated_at();
create trigger meal_plan_templates_identity_guard
  before update on public.meal_plan_templates
  for each row execute procedure private.prevent_meal_plan_template_identity_change();
create trigger meal_plan_templates_audit
  after insert or update on public.meal_plan_templates
  for each row execute procedure private.audit_meal_plan_template_change();
create trigger meal_plan_template_meals_audit
  after insert on public.meal_plan_template_meals
  for each row execute procedure private.audit_meal_plan_template_change();
create trigger meal_plan_template_items_audit
  after insert on public.meal_plan_template_items
  for each row execute procedure private.audit_meal_plan_template_change();

alter table public.meal_plan_templates enable row level security;
alter table public.meal_plan_template_meals enable row level security;
alter table public.meal_plan_template_items enable row level security;

revoke all on table public.meal_plan_templates from anon, authenticated;
revoke all on table public.meal_plan_template_meals from anon, authenticated;
revoke all on table public.meal_plan_template_items from anon, authenticated;
grant select on table public.meal_plan_templates to authenticated;
grant select on table public.meal_plan_template_meals to authenticated;
grant select on table public.meal_plan_template_items to authenticated;

create policy meal_plan_templates_select_clinician
  on public.meal_plan_templates for select to authenticated
  using ((select private.has_meal_plan_role(organization_id)));
create policy meal_plan_template_meals_select_clinician
  on public.meal_plan_template_meals for select to authenticated
  using ((select private.has_meal_plan_role(organization_id)));
create policy meal_plan_template_items_select_clinician
  on public.meal_plan_template_items for select to authenticated
  using ((select private.has_meal_plan_role(organization_id)));

create function public.create_meal_plan_template_from_plan(
  target_plan_id uuid,
  template_name text,
  template_category text,
  template_description text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  plan_row public.meal_plans;
  source_meal public.meal_plan_meals;
  created_template_id uuid;
  created_template_meal_id uuid;
begin
  select * into plan_row from public.meal_plans where id = target_plan_id;
  if plan_row.id is null then raise exception 'Meal plan not found'; end if;
  if not (select private.has_meal_plan_role(plan_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;
  if not exists (
    select 1 from public.meal_plan_items
    where meal_plan_id = target_plan_id and deleted_at is null
  ) then raise exception 'Meal plan template requires at least one item'; end if;

  insert into public.meal_plan_templates (
    organization_id, source_plan_id, name, category, description,
    target_energy_kcal, target_protein_g, target_carbohydrate_g,
    target_fat_g, instructions, created_by
  ) values (
    plan_row.organization_id, plan_row.id, trim(template_name),
    nullif(trim(template_category), ''), nullif(trim(template_description), ''),
    plan_row.target_energy_kcal, plan_row.target_protein_g,
    plan_row.target_carbohydrate_g, plan_row.target_fat_g,
    plan_row.instructions, (select auth.uid())
  ) returning id into created_template_id;

  for source_meal in
    select * from public.meal_plan_meals
    where meal_plan_id = target_plan_id order by sort_order, created_at
  loop
    insert into public.meal_plan_template_meals (
      organization_id, template_id, name, suggested_time, sort_order
    ) values (
      plan_row.organization_id, created_template_id, source_meal.name,
      source_meal.suggested_time, source_meal.sort_order
    ) returning id into created_template_meal_id;

    insert into public.meal_plan_template_items (
      organization_id, template_id, template_meal_id, food_name, quantity,
      unit, guidance, sort_order, food_group_id, food_group_name_snapshot,
      equivalent_count, equivalent_energy_kcal, equivalent_protein_g,
      equivalent_carbohydrate_g, equivalent_fat_g
    )
    select item.organization_id, created_template_id, created_template_meal_id,
      item.food_name, item.quantity, item.unit, item.guidance, item.sort_order,
      item.food_group_id, item.food_group_name_snapshot, item.equivalent_count,
      item.equivalent_energy_kcal, item.equivalent_protein_g,
      item.equivalent_carbohydrate_g, item.equivalent_fat_g
    from public.meal_plan_items as item
    where item.meal_id = source_meal.id and item.deleted_at is null
    order by item.sort_order, item.created_at;
  end loop;
  return created_template_id;
end;
$$;

create function public.create_meal_plan_from_template(
  target_template_id uuid,
  target_patient_id uuid,
  plan_name text,
  plan_starts_on date,
  plan_ends_on date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  template_row public.meal_plan_templates;
  patient_row public.patients;
  template_meal public.meal_plan_template_meals;
  created_plan_id uuid;
  created_meal_id uuid;
begin
  select * into template_row from public.meal_plan_templates
  where id = target_template_id and is_active;
  if template_row.id is null then raise exception 'Active template not found'; end if;
  if not (select private.has_meal_plan_role(template_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;
  select * into patient_row from public.patients
  where id = target_patient_id and organization_id = template_row.organization_id
    and status = 'active' and deleted_at is null;
  if patient_row.id is null then raise exception 'Active patient not found'; end if;
  if plan_ends_on is not null and plan_starts_on is not null
    and plan_ends_on < plan_starts_on then
    raise exception 'Plan end date cannot precede start date';
  end if;

  insert into public.meal_plans (
    organization_id, patient_id, name, starts_on, ends_on,
    target_energy_kcal, target_protein_g, target_carbohydrate_g,
    target_fat_g, instructions, created_by
  ) values (
    template_row.organization_id, patient_row.id, trim(plan_name),
    plan_starts_on, plan_ends_on, template_row.target_energy_kcal,
    template_row.target_protein_g, template_row.target_carbohydrate_g,
    template_row.target_fat_g, template_row.instructions, (select auth.uid())
  ) returning id into created_plan_id;

  for template_meal in
    select * from public.meal_plan_template_meals
    where template_id = target_template_id order by sort_order, created_at
  loop
    insert into public.meal_plan_meals (
      organization_id, meal_plan_id, name, suggested_time, sort_order
    ) values (
      template_row.organization_id, created_plan_id, template_meal.name,
      template_meal.suggested_time, template_meal.sort_order
    ) returning id into created_meal_id;

    insert into public.meal_plan_items (
      organization_id, meal_plan_id, meal_id, food_name, quantity, unit,
      guidance, sort_order, created_by, food_group_id, food_group_name_snapshot,
      equivalent_count, equivalent_energy_kcal, equivalent_protein_g,
      equivalent_carbohydrate_g, equivalent_fat_g
    )
    select item.organization_id, created_plan_id, created_meal_id,
      item.food_name, item.quantity, item.unit, item.guidance, item.sort_order,
      (select auth.uid()), item.food_group_id, item.food_group_name_snapshot,
      item.equivalent_count, item.equivalent_energy_kcal,
      item.equivalent_protein_g, item.equivalent_carbohydrate_g,
      item.equivalent_fat_g
    from public.meal_plan_template_items as item
    where item.template_meal_id = template_meal.id
    order by item.sort_order, item.created_at;
  end loop;
  return created_plan_id;
end;
$$;

create function public.archive_meal_plan_template(target_template_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare template_row public.meal_plan_templates;
begin
  select * into template_row from public.meal_plan_templates where id = target_template_id;
  if template_row.id is null then raise exception 'Template not found'; end if;
  if not (select private.has_meal_plan_role(template_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;
  update public.meal_plan_templates set is_active = false where id = target_template_id;
end;
$$;

create function public.record_meal_plan_template_read(target_template_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare template_row public.meal_plan_templates;
begin
  select * into template_row from public.meal_plan_templates where id = target_template_id;
  if template_row.id is null then raise exception 'Template not found'; end if;
  if not (select private.has_meal_plan_role(template_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id
  ) values (
    template_row.organization_id, (select auth.uid()), 'read',
    'meal_plan_templates', template_row.id
  );
end;
$$;

revoke all on function public.create_meal_plan_template_from_plan(uuid,text,text,text) from public;
revoke all on function public.create_meal_plan_from_template(uuid,uuid,text,date,date) from public;
revoke all on function public.archive_meal_plan_template(uuid) from public;
revoke all on function public.record_meal_plan_template_read(uuid) from public;
grant execute on function public.create_meal_plan_template_from_plan(uuid,text,text,text) to authenticated;
grant execute on function public.create_meal_plan_from_template(uuid,uuid,text,date,date) to authenticated;
grant execute on function public.archive_meal_plan_template(uuid) to authenticated;
grant execute on function public.record_meal_plan_template_read(uuid) to authenticated;
