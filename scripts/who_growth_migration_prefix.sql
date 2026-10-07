-- Generated from official WHO workbooks by scripts/generate_who_growth_migration.py.
-- Do not edit imported clinical reference values by hand.

create table public.who_growth_reference_sources (
  id text primary key,
  reference_version text not null check (reference_version in ('who-2006','who-2007')),
  indicator text not null check (indicator in ('bmi_for_age','height_for_age','weight_for_age')),
  reference_sex public.growth_reference_sex not null,
  age_unit text not null check (age_unit in ('day','month')),
  source_url text not null,
  source_sha256 text not null unique check (source_sha256 ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz not null default now(),
  unique (reference_version, indicator, reference_sex)
);

create table public.who_growth_reference_parameters (
  source_id text not null references public.who_growth_reference_sources (id) on delete restrict,
  age_value integer not null check (age_value >= 0),
  l_value numeric not null,
  m_value numeric not null check (m_value > 0),
  s_value numeric not null check (s_value > 0),
  primary key (source_id, age_value)
);

alter table public.who_growth_reference_sources enable row level security;
alter table public.who_growth_reference_parameters enable row level security;
revoke all on table public.who_growth_reference_sources from anon, authenticated;
revoke all on table public.who_growth_reference_parameters from anon, authenticated;

alter table public.anthropometric_measurements
  drop constraint anthropometric_measurements_weight_kg_check,
  drop constraint anthropometric_measurements_height_cm_check,
  drop constraint anthropometric_measurements_age_years_snapshot_check,
  alter column bmi_classification drop not null,
  alter column normal_weight_min_kg drop not null,
  alter column normal_weight_max_kg drop not null,
  alter column age_years_snapshot drop not null,
  add constraint anthropometric_measurements_weight_kg_check check (weight_kg between 0.5 and 300),
  add constraint anthropometric_measurements_height_cm_check check (height_cm between 20 and 250),
  add column calculation_pathway text not null default 'adult' check (calculation_pathway in ('adult','paediatric')),
  add column age_days_snapshot integer check (age_days_snapshot is null or age_days_snapshot >= 0),
  add column age_months_snapshot integer check (age_months_snapshot is null or age_months_snapshot >= 0),
  add column growth_reference_version text check (growth_reference_version in ('who-2006','who-2007')),
  add column bmi_for_age_z numeric(6,3),
  add column height_for_age_z numeric(6,3),
  add column weight_for_age_z numeric(6,3),
  add column bmi_for_age_classification text,
  add column height_for_age_classification text,
  add column weight_for_age_classification text,
  add column plausibility_flags text[] not null default '{}';

alter table public.anthropometric_measurements add constraint anthropometric_measurements_pathway_check check (
  (calculation_pathway = 'adult'
    and bmi_classification is not null
    and normal_weight_min_kg is not null
    and normal_weight_max_kg is not null
    and age_years_snapshot >= 18
    and growth_reference_version is null
    and bmi_for_age_z is null
    and height_for_age_z is null)
  or
  (calculation_pathway = 'paediatric'
    and bmi_classification is null
    and normal_weight_min_kg is null
    and normal_weight_max_kg is null
    and estimated_body_fat_percent is null
    and age_days_snapshot is not null
    and age_months_snapshot is not null
    and growth_reference_version is not null
    and bmi_for_age_z is not null
    and height_for_age_z is not null)
);
