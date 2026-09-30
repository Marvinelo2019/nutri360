create table public.patient_health_histories (
  patient_id uuid primary key references public.patients (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  medical_history text check (medical_history is null or char_length(medical_history) <= 8000),
  diagnoses text check (diagnoses is null or char_length(diagnoses) <= 4000),
  family_history text check (family_history is null or char_length(family_history) <= 4000),
  allergies text check (allergies is null or char_length(allergies) <= 4000),
  medications text check (medications is null or char_length(medications) <= 4000),
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_health_histories_patient_org_fkey foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict
);

create table public.dietary_histories (
  patient_id uuid primary key references public.patients (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  recall_24h text check (recall_24h is null or char_length(recall_24h) <= 12000),
  eating_habits text check (eating_habits is null or char_length(eating_habits) <= 8000),
  water_liters numeric(4,2) check (water_liters is null or water_liters between 0 and 20),
  sleep_hours numeric(4,2) check (sleep_hours is null or sleep_hours between 0 and 24),
  physical_activity text check (physical_activity is null or char_length(physical_activity) <= 4000),
  preferences text check (preferences is null or char_length(preferences) <= 4000),
  restrictions text check (restrictions is null or char_length(restrictions) <= 4000),
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dietary_histories_patient_org_fkey foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict
);

create table public.lab_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  test_name text not null check (char_length(trim(test_name)) between 1 and 160),
  result_value numeric(14,4) not null,
  unit text not null check (char_length(trim(unit)) between 1 and 40),
  reference_min numeric(14,4),
  reference_max numeric(14,4),
  collected_on date not null check (collected_on <= current_date),
  notes text check (notes is null or char_length(notes) <= 2000),
  recorded_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint lab_results_reference_order check (
    reference_min is null or reference_max is null or reference_max >= reference_min
  ),
  constraint lab_results_patient_org_fkey foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict
);

create index lab_results_patient_date_idx on public.lab_results (patient_id, collected_on desc, created_at desc);

create trigger patient_health_histories_set_updated_at before update on public.patient_health_histories
  for each row execute procedure private.set_updated_at();
create trigger dietary_histories_set_updated_at before update on public.dietary_histories
  for each row execute procedure private.set_updated_at();
create trigger patient_health_histories_identity_guard before update on public.patient_health_histories
  for each row execute procedure private.prevent_patient_child_identity_change();
create trigger dietary_histories_identity_guard before update on public.dietary_histories
  for each row execute procedure private.prevent_patient_child_identity_change();
create trigger lab_results_identity_guard before update on public.lab_results
  for each row execute procedure private.prevent_patient_child_identity_change();
create trigger patient_health_histories_audit after insert or update on public.patient_health_histories
  for each row execute procedure private.audit_patient_child_change();
create trigger dietary_histories_audit after insert or update on public.dietary_histories
  for each row execute procedure private.audit_patient_child_change();
create trigger lab_results_audit after insert on public.lab_results
  for each row execute procedure private.audit_patient_child_change();

alter table public.patient_health_histories enable row level security;
alter table public.dietary_histories enable row level security;
alter table public.lab_results enable row level security;
revoke all on table public.patient_health_histories from anon, authenticated;
revoke all on table public.dietary_histories from anon, authenticated;
revoke all on table public.lab_results from anon, authenticated;
grant select on table public.patient_health_histories to authenticated;
grant select on table public.dietary_histories to authenticated;
grant select on table public.lab_results to authenticated;

create policy patient_health_histories_select_clinician on public.patient_health_histories
  for select to authenticated using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist']::public.app_role[])));
create policy dietary_histories_select_clinician on public.dietary_histories
  for select to authenticated using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist']::public.app_role[])));
create policy lab_results_select_clinician on public.lab_results
  for select to authenticated using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist']::public.app_role[])));

create function public.save_patient_histories(
  target_patient_id uuid,
  history_medical text,
  history_diagnoses text,
  history_family text,
  history_allergies text,
  history_medications text,
  dietary_recall_24h text,
  dietary_eating_habits text,
  dietary_water_liters numeric,
  dietary_sleep_hours numeric,
  dietary_physical_activity text,
  dietary_preferences text,
  dietary_restrictions text
)
returns void language plpgsql security definer set search_path = '' as $$
declare patient_row public.patients;
begin
  select * into patient_row from public.patients where id=target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(patient_row.organization_id,array['owner','nutritionist']::public.app_role[])) then
    raise exception 'Clinical role required';
  end if;

  insert into public.patient_health_histories (
    patient_id,organization_id,medical_history,diagnoses,family_history,allergies,medications,updated_by
  ) values (
    patient_row.id,patient_row.organization_id,nullif(trim(history_medical),''),nullif(trim(history_diagnoses),''),
    nullif(trim(history_family),''),nullif(trim(history_allergies),''),nullif(trim(history_medications),''),(select auth.uid())
  ) on conflict (patient_id) do update set
    medical_history=excluded.medical_history, diagnoses=excluded.diagnoses, family_history=excluded.family_history,
    allergies=excluded.allergies, medications=excluded.medications, updated_by=excluded.updated_by;

  insert into public.dietary_histories (
    patient_id,organization_id,recall_24h,eating_habits,water_liters,sleep_hours,physical_activity,preferences,restrictions,updated_by
  ) values (
    patient_row.id,patient_row.organization_id,nullif(trim(dietary_recall_24h),''),nullif(trim(dietary_eating_habits),''),
    dietary_water_liters,dietary_sleep_hours,nullif(trim(dietary_physical_activity),''),nullif(trim(dietary_preferences),''),
    nullif(trim(dietary_restrictions),''),(select auth.uid())
  ) on conflict (patient_id) do update set
    recall_24h=excluded.recall_24h, eating_habits=excluded.eating_habits, water_liters=excluded.water_liters,
    sleep_hours=excluded.sleep_hours, physical_activity=excluded.physical_activity, preferences=excluded.preferences,
    restrictions=excluded.restrictions, updated_by=excluded.updated_by;
end;
$$;

create function public.record_lab_result(
  target_patient_id uuid,
  laboratory_test_name text,
  laboratory_result_value numeric,
  laboratory_unit text,
  laboratory_reference_min numeric,
  laboratory_reference_max numeric,
  laboratory_collected_on date,
  laboratory_notes text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare patient_row public.patients; created_result_id uuid;
begin
  select * into patient_row from public.patients where id=target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(patient_row.organization_id,array['owner','nutritionist']::public.app_role[])) then
    raise exception 'Clinical role required';
  end if;
  insert into public.lab_results (
    patient_id,organization_id,test_name,result_value,unit,reference_min,reference_max,collected_on,notes,recorded_by
  ) values (
    patient_row.id,patient_row.organization_id,trim(laboratory_test_name),laboratory_result_value,trim(laboratory_unit),
    laboratory_reference_min,laboratory_reference_max,laboratory_collected_on,nullif(trim(laboratory_notes),''),(select auth.uid())
  ) returning id into created_result_id;
  return created_result_id;
end;
$$;

revoke all on function public.save_patient_histories(uuid,text,text,text,text,text,text,text,numeric,numeric,text,text,text) from public;
revoke all on function public.record_lab_result(uuid,text,numeric,text,numeric,numeric,date,text) from public;
grant execute on function public.save_patient_histories(uuid,text,text,text,text,text,text,text,numeric,numeric,text,text,text) to authenticated;
grant execute on function public.record_lab_result(uuid,text,numeric,text,numeric,numeric,date,text) to authenticated;
