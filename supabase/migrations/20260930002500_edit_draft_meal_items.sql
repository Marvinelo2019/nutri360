create function public.update_meal_plan_item(
  target_item_id uuid,
  item_food_name text,
  item_quantity numeric,
  item_unit text,
  item_guidance text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  item_row public.meal_plan_items;
begin
  select * into item_row
  from public.meal_plan_items
  where id = target_item_id and deleted_at is null;

  if item_row.id is null then raise exception 'Meal plan item not found'; end if;
  if not (select private.has_meal_plan_role(item_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;
  if exists (
    select 1 from public.meal_plans
    where id = item_row.meal_plan_id and status <> 'draft'
  ) then raise exception 'Only draft meal plans can be changed'; end if;

  update public.meal_plan_items
  set food_name = trim(item_food_name),
      quantity = item_quantity,
      unit = trim(item_unit),
      guidance = nullif(trim(item_guidance), '')
  where id = target_item_id;
end;
$$;

revoke all on function public.update_meal_plan_item(uuid,text,numeric,text,text) from public;
grant execute on function public.update_meal_plan_item(uuid,text,numeric,text,text) to authenticated;
