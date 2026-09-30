-- Immutable, versioned adult energy and macronutrient calculations.

create type public.energy_formula as enum (
  'mifflin_st_jeor',
  'harris_benedict_revised',
  'fao_who_unu'
);

create type public.macro_distribution_method as enum (
  'percentage',
  'grams_per_kg'
);

create table public.energy_calculations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null,
  measurement_id uuid not null references public.anthropometric_measurements (id) on delete restrict,
  formula public.energy_formula not null,
  formula_version text not null check (char_length(formula_version) between 1 and 80),
  reference_sex public.growth_reference_sex not null,
  age_years_snapshot integer not null check (age_years_snapshot >= 18),
  weight_kg_snapshot numeric(6,2) not null check (weight_kg_snapshot between 20 and 300),
  height_cm_snapshot numeric(6,2) not null check (height_cm_snapshot between 50 and 250),
  activity_factor numeric(4,2) not null check (activity_factor between 1 and 2.5),
  goal_adjustment_kcal integer not null check (goal_adjustment_kcal between -1500 and 1500),
  resting_energy_kcal numeric(8,2) not null check (resting_energy_kcal > 0),
  total_energy_kcal numeric(8,2) not null check (total_energy_kcal > 0),
  target_energy_kcal integer not null check (target_energy_kcal between 500 and 8000),
  macro_method public.macro_distribution_method not null,
  protein_input numeric(6,2) not null check (protein_input >= 0),
  carbohydrate_input numeric(6,2) not null check (carbohydrate_input >= 0),
  fat_input numeric(6,2) not null check (fat_input >= 0),
  target_protein_g numeric(7,2) not null check (target_protein_g between 0 and 1000),
  target_carbohydrate_g numeric(7,2) not null check (target_carbohydrate_g between 0 and 1500),
  target_fat_g numeric(7,2) not null check (target_fat_g between 0 and 500),
  macro_energy_kcal integer not null check (macro_energy_kcal between 0 and 8000),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict
);

create index energy_calculations_patient_date_idx
  on public.energy_calculations (patient_id, created_at desc);
create index energy_calculations_org_date_idx
  on public.energy_calculations (organization_id, created_at desc);

create function private.prevent_energy_calculation_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Energy calculations are immutable';
end;
$$;

create trigger energy_calculations_immutable
  before update or delete on public.energy_calculations
  for each row execute procedure private.prevent_energy_calculation_change();

create function private.audit_energy_calculation_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    new.organization_id, (select auth.uid()), 'insert', 'energy_calculations', new.id,
    jsonb_build_object('patient_id', new.patient_id, 'formula', new.formula)
  );
  return new;
end;
$$;

create trigger energy_calculations_audit
  after insert on public.energy_calculations
  for each row execute procedure private.audit_energy_calculation_insert();

alter table public.energy_calculations enable row level security;
revoke all on table public.energy_calculations from anon, authenticated;
grant select on table public.energy_calculations to authenticated;

create policy energy_calculations_select_clinician
  on public.energy_calculations for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )));

create function public.create_energy_calculation(
  target_patient_id uuid,
  source_measurement_id uuid,
  selected_formula public.energy_formula,
  selected_activity_factor numeric,
  selected_goal_adjustment_kcal integer,
  selected_macro_method public.macro_distribution_method,
  selected_protein numeric,
  selected_carbohydrate numeric,
  selected_fat numeric
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_row public.patients;
  measurement_row public.anthropometric_measurements;
  age_years integer;
  resting_kcal numeric;
  total_kcal numeric;
  target_kcal integer;
  protein_g numeric;
  carbohydrate_g numeric;
  fat_g numeric;
  macro_kcal integer;
  version_label text;
  created_id uuid;
  height_m numeric;
begin
  select * into patient_row
  from public.patients
  where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  if patient_row.growth_reference_sex is null then
    raise exception 'Reference sex is required for this calculation';
  end if;

  select * into measurement_row
  from public.anthropometric_measurements
  where id = source_measurement_id
    and patient_id = patient_row.id
    and organization_id = patient_row.organization_id;
  if measurement_row.id is null then raise exception 'Patient measurement not found'; end if;

  age_years := extract(year from age(current_date, patient_row.birth_date))::integer;
  if age_years < 18 then raise exception 'Adult calculation requires age 18 or older'; end if;
  if selected_activity_factor is null or selected_activity_factor < 1 or selected_activity_factor > 2.5 then
    raise exception 'Activity factor must be between 1 and 2.5';
  end if;
  if selected_goal_adjustment_kcal is null or selected_goal_adjustment_kcal < -1500 or selected_goal_adjustment_kcal > 1500 then
    raise exception 'Goal adjustment must be between -1500 and 1500 kcal';
  end if;
  if selected_protein is null or selected_carbohydrate is null or selected_fat is null then
    raise exception 'Macronutrient inputs are required';
  end if;

  height_m := measurement_row.height_cm / 100;
  case selected_formula
    when 'mifflin_st_jeor' then
      resting_kcal := 9.99 * measurement_row.weight_kg
        + 6.25 * measurement_row.height_cm
        - 4.92 * age_years
        + case when patient_row.growth_reference_sex = 'male' then 5 else -161 end;
      version_label := 'mifflin-st-jeor-1990-v1';
    when 'harris_benedict_revised' then
      resting_kcal := case when patient_row.growth_reference_sex = 'male'
        then 88.362 + 13.397 * measurement_row.weight_kg
          + 4.799 * measurement_row.height_cm - 5.677 * age_years
        else 447.593 + 9.247 * measurement_row.weight_kg
          + 3.098 * measurement_row.height_cm - 4.330 * age_years end;
      version_label := 'harris-benedict-roza-shizgal-1984-v1';
    when 'fao_who_unu' then
      resting_kcal := case
        when patient_row.growth_reference_sex = 'male' and age_years < 30
          then 15.4 * measurement_row.weight_kg - 27 * height_m + 717
        when patient_row.growth_reference_sex = 'male' and age_years < 60
          then 11.3 * measurement_row.weight_kg + 16 * height_m + 901
        when patient_row.growth_reference_sex = 'male'
          then 8.8 * measurement_row.weight_kg + 1128 * height_m - 1071
        when age_years < 30
          then 13.3 * measurement_row.weight_kg + 334 * height_m + 35
        when age_years < 60
          then 8.7 * measurement_row.weight_kg - 25 * height_m + 865
        else 9.2 * measurement_row.weight_kg + 637 * height_m - 302
      end;
      version_label := 'fao-who-unu-1985-height-v1';
  end case;

  total_kcal := resting_kcal * selected_activity_factor;
  target_kcal := round(total_kcal + selected_goal_adjustment_kcal)::integer;
  if target_kcal < 500 or target_kcal > 8000 then
    raise exception 'Calculated energy target must be between 500 and 8000 kcal';
  end if;

  case selected_macro_method
    when 'percentage' then
      if selected_protein > 100 or selected_carbohydrate > 100 or selected_fat > 100
        or abs(selected_protein + selected_carbohydrate + selected_fat - 100) > 0.01 then
        raise exception 'Macronutrient percentages must total 100';
      end if;
      protein_g := target_kcal * selected_protein / 100 / 4;
      carbohydrate_g := target_kcal * selected_carbohydrate / 100 / 4;
      fat_g := target_kcal * selected_fat / 100 / 9;
    when 'grams_per_kg' then
      if selected_protein > 10 or selected_carbohydrate > 15 or selected_fat > 5 then
        raise exception 'Macronutrient grams per kilogram are outside supported bounds';
      end if;
      protein_g := measurement_row.weight_kg * selected_protein;
      carbohydrate_g := measurement_row.weight_kg * selected_carbohydrate;
      fat_g := measurement_row.weight_kg * selected_fat;
  end case;

  protein_g := round(protein_g, 2);
  carbohydrate_g := round(carbohydrate_g, 2);
  fat_g := round(fat_g, 2);
  macro_kcal := round(protein_g * 4 + carbohydrate_g * 4 + fat_g * 9)::integer;
  if macro_kcal > 8000 then raise exception 'Macronutrient energy exceeds supported bounds'; end if;

  insert into public.energy_calculations (
    organization_id, patient_id, measurement_id, formula, formula_version,
    reference_sex, age_years_snapshot, weight_kg_snapshot, height_cm_snapshot,
    activity_factor, goal_adjustment_kcal, resting_energy_kcal, total_energy_kcal,
    target_energy_kcal, macro_method, protein_input, carbohydrate_input, fat_input,
    target_protein_g, target_carbohydrate_g, target_fat_g, macro_energy_kcal, created_by
  ) values (
    patient_row.organization_id, patient_row.id, measurement_row.id, selected_formula,
    version_label, patient_row.growth_reference_sex, age_years,
    measurement_row.weight_kg, measurement_row.height_cm, selected_activity_factor,
    selected_goal_adjustment_kcal, round(resting_kcal, 2), round(total_kcal, 2),
    target_kcal, selected_macro_method, selected_protein, selected_carbohydrate,
    selected_fat, protein_g, carbohydrate_g, fat_g, macro_kcal, (select auth.uid())
  ) returning id into created_id;

  return created_id;
end;
$$;

create function public.record_energy_calculation_read(target_calculation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare calculation_row public.energy_calculations;
begin
  select * into calculation_row from public.energy_calculations where id = target_calculation_id;
  if calculation_row.id is null then raise exception 'Energy calculation not found'; end if;
  if not (select private.has_organization_role(
    calculation_row.organization_id,
    array['owner', 'nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    metadata
  ) values (
    calculation_row.organization_id, (select auth.uid()), 'read',
    'energy_calculations', calculation_row.id,
    jsonb_build_object('patient_id', calculation_row.patient_id)
  );
end;
$$;

revoke all on function public.create_energy_calculation(
  uuid, uuid, public.energy_formula, numeric, integer,
  public.macro_distribution_method, numeric, numeric, numeric
) from public;
revoke all on function public.record_energy_calculation_read(uuid) from public;
grant execute on function public.create_energy_calculation(
  uuid, uuid, public.energy_formula, numeric, integer,
  public.macro_distribution_method, numeric, numeric, numeric
) to authenticated;
grant execute on function public.record_energy_calculation_read(uuid) to authenticated;
