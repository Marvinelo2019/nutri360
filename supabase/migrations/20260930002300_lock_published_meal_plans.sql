-- Published meal plans are immutable clinical versions.

create function private.ensure_draft_meal_plan_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.meal_plans
    where id = new.meal_plan_id and status <> 'draft'
  ) then raise exception 'Only draft meal plans can be changed'; end if;
  return new;
end;
$$;

create trigger meal_plan_items_require_draft
  before insert or update on public.meal_plan_items
  for each row execute procedure private.ensure_draft_meal_plan_item();

create or replace function public.change_meal_plan_status(target_plan_id uuid, next_status public.meal_plan_status)
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
