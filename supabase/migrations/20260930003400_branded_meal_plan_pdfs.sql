-- Private clinic branding assets and generated meal-plan PDFs.

alter table public.meal_plans
  add column pdf_object_path text,
  add column pdf_generated_at timestamptz,
  add column pdf_generated_by uuid references auth.users (id) on delete restrict,
  add constraint meal_plans_pdf_metadata_check check (
    (pdf_object_path is null and pdf_generated_at is null and pdf_generated_by is null)
    or (
      pdf_object_path is not null
      and char_length(pdf_object_path) between 1 and 512
      and pdf_generated_at is not null
      and pdf_generated_by is not null
    )
  );

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values
  (
    'organization-assets', 'organization-assets', false, 2097152,
    array['image/png', 'image/jpeg']
  ),
  (
    'meal-plan-pdfs', 'meal-plan-pdfs', false, 10485760,
    array['application/pdf']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.storage_path_organization_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1)
      ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

revoke all on function private.storage_path_organization_id(text) from public;
grant execute on function private.storage_path_organization_id(text) to authenticated;

create policy organization_assets_select_clinician
  on storage.objects for select to authenticated
  using (
    bucket_id = 'organization-assets'
    and (select private.has_meal_plan_role(
      private.storage_path_organization_id(name)
    ))
  );

create policy organization_assets_insert_owner
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'organization-assets'
    and (select private.has_organization_role(
      private.storage_path_organization_id(name),
      array['owner']::public.app_role[]
    ))
  );

create policy organization_assets_update_owner
  on storage.objects for update to authenticated
  using (
    bucket_id = 'organization-assets'
    and (select private.has_organization_role(
      private.storage_path_organization_id(name),
      array['owner']::public.app_role[]
    ))
  )
  with check (
    bucket_id = 'organization-assets'
    and (select private.has_organization_role(
      private.storage_path_organization_id(name),
      array['owner']::public.app_role[]
    ))
  );

create policy organization_assets_delete_owner
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'organization-assets'
    and (select private.has_organization_role(
      private.storage_path_organization_id(name),
      array['owner']::public.app_role[]
    ))
  );

create policy meal_plan_pdfs_select_clinician
  on storage.objects for select to authenticated
  using (
    bucket_id = 'meal-plan-pdfs'
    and (select private.has_meal_plan_role(
      private.storage_path_organization_id(name)
    ))
  );

create policy meal_plan_pdfs_insert_clinician
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'meal-plan-pdfs'
    and (select private.has_meal_plan_role(
      private.storage_path_organization_id(name)
    ))
  );

create policy meal_plan_pdfs_update_clinician
  on storage.objects for update to authenticated
  using (
    bucket_id = 'meal-plan-pdfs'
    and (select private.has_meal_plan_role(
      private.storage_path_organization_id(name)
    ))
  )
  with check (
    bucket_id = 'meal-plan-pdfs'
    and (select private.has_meal_plan_role(
      private.storage_path_organization_id(name)
    ))
  );

create policy meal_plan_pdfs_delete_owner
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'meal-plan-pdfs'
    and (select private.has_organization_role(
      private.storage_path_organization_id(name),
      array['owner']::public.app_role[]
    ))
  );

create function public.update_organization_branding(
  target_organization_id uuid,
  organization_name text,
  organization_brand_color text,
  organization_phone_e164 text,
  organization_logo_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.has_organization_role(
    target_organization_id,
    array['owner']::public.app_role[]
  )) then
    raise exception 'Owner role required';
  end if;

  if organization_logo_path is not null and (
    organization_logo_path !~ ('^' || target_organization_id::text || '/logo\.(png|jpg)$')
  ) then
    raise exception 'Invalid organization logo path';
  end if;

  update public.organizations set
    name = trim(organization_name),
    brand_color = upper(organization_brand_color),
    phone_e164 = nullif(trim(organization_phone_e164), ''),
    logo_path = nullif(trim(organization_logo_path), '')
  where id = target_organization_id and deleted_at is null;

  if not found then raise exception 'Organization not found'; end if;
end;
$$;

create function public.register_meal_plan_pdf(
  target_plan_id uuid,
  object_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare plan_row public.meal_plans;
begin
  select * into plan_row from public.meal_plans where id = target_plan_id;
  if plan_row.id is null then raise exception 'Meal plan not found'; end if;
  if not (select private.has_meal_plan_role(plan_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;
  if plan_row.status = 'draft' then
    raise exception 'Draft meal plans cannot generate final PDFs';
  end if;
  if object_path !~ (
    '^' || plan_row.organization_id::text || '/' || plan_row.id::text
    || '/meal-plan-[0-9]{8}T[0-9]{6}Z\.pdf$'
  ) then
    raise exception 'Invalid meal plan PDF path';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'meal-plan-pdfs' and name = object_path
  ) then
    raise exception 'Meal plan PDF object not found';
  end if;

  update public.meal_plans set
    pdf_object_path = object_path,
    pdf_generated_at = now(),
    pdf_generated_by = (select auth.uid())
  where id = target_plan_id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    metadata
  ) values (
    plan_row.organization_id, (select auth.uid()), 'generate_pdf',
    'meal_plans', plan_row.id, jsonb_build_object('object_path', object_path)
  );
end;
$$;

create function public.record_meal_plan_pdf_download(target_plan_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare plan_row public.meal_plans;
begin
  select * into plan_row from public.meal_plans where id = target_plan_id;
  if plan_row.id is null or plan_row.pdf_object_path is null then
    raise exception 'Meal plan PDF not found';
  end if;
  if not (select private.has_meal_plan_role(plan_row.organization_id)) then
    raise exception 'Clinical role required';
  end if;

  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    metadata
  ) values (
    plan_row.organization_id, (select auth.uid()), 'download_pdf',
    'meal_plans', plan_row.id,
    jsonb_build_object('object_path', plan_row.pdf_object_path)
  );
  return plan_row.pdf_object_path;
end;
$$;

revoke all on function public.update_organization_branding(uuid,text,text,text,text) from public;
revoke all on function public.register_meal_plan_pdf(uuid,text) from public;
revoke all on function public.record_meal_plan_pdf_download(uuid) from public;
grant execute on function public.update_organization_branding(uuid,text,text,text,text) to authenticated;
grant execute on function public.register_meal_plan_pdf(uuid,text) to authenticated;
grant execute on function public.record_meal_plan_pdf_download(uuid) to authenticated;
