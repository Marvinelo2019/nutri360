create function private.who_lms_z(
  measured_value numeric,
  l_value numeric,
  m_value numeric,
  s_value numeric,
  restrict_extreme boolean
)
returns numeric language plpgsql immutable set search_path = '' as $$
declare raw_z numeric; sd2 numeric; sd3 numeric;
begin
  raw_z := case when l_value = 0
    then ln(measured_value / m_value) / s_value
    else (power(measured_value / m_value, l_value) - 1) / (l_value * s_value)
  end;
  if not restrict_extreme or raw_z between -3 and 3 then return raw_z; end if;
  if raw_z > 3 then
    sd2 := m_value * power(1 + l_value * s_value * 2, 1 / l_value);
    sd3 := m_value * power(1 + l_value * s_value * 3, 1 / l_value);
    return 3 + (measured_value - sd3) / (sd3 - sd2);
  end if;
  sd2 := m_value * power(1 + l_value * s_value * -2, 1 / l_value);
  sd3 := m_value * power(1 + l_value * s_value * -3, 1 / l_value);
  return -3 + (measured_value - sd3) / (sd2 - sd3);
end;
$$;

create function public.record_paediatric_anthropometry(
  target_patient_id uuid,
  measured_weight_kg numeric,
  measured_height_cm numeric,
  measurement_time timestamptz default now()
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_row public.patients;
  age_days integer;
  age_months integer;
  target_reference_version text;
  reference_age integer;
  bmi_value numeric;
  bmi_reference record;
  height_reference record;
  weight_reference record;
  bmi_z numeric;
  height_z numeric;
  weight_z numeric;
  bmi_classification text;
  height_classification text;
  weight_classification text;
  flags text[] := array[]::text[];
  created_measurement_id uuid;
begin
  select * into patient_row from public.patients
  where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id, array['owner','nutritionist']::public.app_role[]
  )) then raise exception 'Clinical role required'; end if;
  if patient_row.growth_reference_sex is null then raise exception 'Growth reference sex required'; end if;
  if measurement_time > now() + interval '5 minutes' then raise exception 'Measurement date cannot be in the future'; end if;
  if measured_weight_kg not between 0.5 and 300 then raise exception 'Weight outside paediatric bounds'; end if;
  if measured_height_cm not between 20 and 250 then raise exception 'Height outside paediatric bounds'; end if;

  age_days := measurement_time::date - patient_row.birth_date;
  if age_days < 0 then raise exception 'Measurement predates birth'; end if;
  if measurement_time::date >= patient_row.birth_date + interval '18 years' then
    raise exception 'Paediatric calculation requires age under 18';
  end if;
  age_months := floor(age_days / 30.4375);
  if age_days <= 1856 then
    target_reference_version := 'who-2006'; reference_age := age_days;
  else
    target_reference_version := 'who-2007'; reference_age := age_months;
    if reference_age < 61 then raise exception 'WHO reference age gap'; end if;
  end if;

  select p.l_value,p.m_value,p.s_value into strict bmi_reference
  from public.who_growth_reference_sources s
  join public.who_growth_reference_parameters p on p.source_id=s.id
  where s.reference_version=target_reference_version and s.indicator='bmi_for_age'
    and s.reference_sex=patient_row.growth_reference_sex and p.age_value=reference_age;
  select p.l_value,p.m_value,p.s_value into strict height_reference
  from public.who_growth_reference_sources s
  join public.who_growth_reference_parameters p on p.source_id=s.id
  where s.reference_version=target_reference_version and s.indicator='height_for_age'
    and s.reference_sex=patient_row.growth_reference_sex and p.age_value=reference_age;

  bmi_value := measured_weight_kg / power(measured_height_cm / 100, 2);
  bmi_z := private.who_lms_z(bmi_value,bmi_reference.l_value,bmi_reference.m_value,bmi_reference.s_value,true);
  height_z := private.who_lms_z(measured_height_cm,height_reference.l_value,height_reference.m_value,height_reference.s_value,false);

  if target_reference_version='who-2006' or reference_age <= 120 then
    select p.l_value,p.m_value,p.s_value into strict weight_reference
    from public.who_growth_reference_sources s
    join public.who_growth_reference_parameters p on p.source_id=s.id
    where s.reference_version=target_reference_version and s.indicator='weight_for_age'
      and s.reference_sex=patient_row.growth_reference_sex and p.age_value=reference_age;
    weight_z := private.who_lms_z(measured_weight_kg,weight_reference.l_value,weight_reference.m_value,weight_reference.s_value,true);
  end if;

  bmi_classification := case
    when bmi_z < -3 then 'severe_thinness'
    when bmi_z < -2 then 'thinness'
    when bmi_z <= 1 then 'expected_range'
    when target_reference_version='who-2006' and bmi_z <= 2 then 'risk_of_overweight'
    when target_reference_version='who-2006' and bmi_z <= 3 then 'overweight'
    when target_reference_version='who-2006' then 'obesity'
    when bmi_z <= 2 then 'overweight'
    else 'obesity'
  end;
  height_classification := case
    when height_z < -3 then 'severe_stunting'
    when height_z < -2 then 'stunting'
    when height_z > 3 then 'tall'
    else 'expected_range'
  end;
  weight_classification := case
    when weight_z is null then null
    when weight_z < -3 then 'severe_underweight'
    when weight_z < -2 then 'underweight'
    else 'not_underweight'
  end;
  if bmi_z < -5 or bmi_z > 5 then flags := array_append(flags,'bmi_for_age_outside_who_plausibility'); end if;
  if height_z < -6 or height_z > 6 then flags := array_append(flags,'height_for_age_outside_who_plausibility'); end if;
  if weight_z is not null and (weight_z < -6 or weight_z > 5) then flags := array_append(flags,'weight_for_age_outside_who_plausibility'); end if;

  insert into public.anthropometric_measurements (
    patient_id,organization_id,measured_at,weight_kg,height_cm,weight_lb,bmi,
    bmi_classification,normal_weight_min_kg,normal_weight_max_kg,
    estimated_body_fat_percent,age_years_snapshot,formula_version,recorded_by,
    calculation_pathway,age_days_snapshot,age_months_snapshot,growth_reference_version,
    bmi_for_age_z,height_for_age_z,weight_for_age_z,bmi_for_age_classification,
    height_for_age_classification,weight_for_age_classification,plausibility_flags
  ) values (
    patient_row.id,patient_row.organization_id,measurement_time,measured_weight_kg,measured_height_cm,
    round(measured_weight_kg*2.20462,2),round(bmi_value,2),null,null,null,null,
    floor(age_days/365.2425), 'who-lms-restricted-v1',(select auth.uid()),
    'paediatric',age_days,age_months,target_reference_version,round(bmi_z,3),round(height_z,3),
    case when weight_z is null then null else round(weight_z,3) end,bmi_classification,
    height_classification,weight_classification,flags
  ) returning id into created_measurement_id;
  return created_measurement_id;
exception when no_data_found then
  raise exception 'WHO reference parameters unavailable';
end;
$$;

revoke all on function public.record_paediatric_anthropometry(uuid,numeric,numeric,timestamptz) from public;
grant execute on function public.record_paediatric_anthropometry(uuid,numeric,numeric,timestamptz) to authenticated;
comment on function public.record_paediatric_anthropometry(uuid,numeric,numeric,timestamptz) is
  'Records WHO 2006/2007 paediatric z-score snapshots. Results are screening indicators, not diagnoses.';
