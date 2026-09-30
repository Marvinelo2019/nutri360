alter table public.anthropometric_measurements
  add column waist_cm numeric(6,2) check (waist_cm is null or waist_cm between 30 and 250),
  add column hip_cm numeric(6,2) check (hip_cm is null or hip_cm between 30 and 250),
  add column waist_hip_ratio numeric(5,3),
  add column arm_cm numeric(6,2) check (arm_cm is null or arm_cm between 10 and 100),
  add column thigh_cm numeric(6,2) check (thigh_cm is null or thigh_cm between 15 and 150),
  add column calf_cm numeric(6,2) check (calf_cm is null or calf_cm between 10 and 100),
  add column triceps_skinfold_mm numeric(6,2) check (triceps_skinfold_mm is null or triceps_skinfold_mm between 1 and 100),
  add column subscapular_skinfold_mm numeric(6,2) check (subscapular_skinfold_mm is null or subscapular_skinfold_mm between 1 and 100),
  add column suprailiac_skinfold_mm numeric(6,2) check (suprailiac_skinfold_mm is null or suprailiac_skinfold_mm between 1 and 100),
  add column abdominal_skinfold_mm numeric(6,2) check (abdominal_skinfold_mm is null or abdominal_skinfold_mm between 1 and 100);

create function public.record_extended_adult_anthropometry(
  target_patient_id uuid, measured_weight_kg numeric, measured_height_cm numeric,
  measured_waist_cm numeric, measured_hip_cm numeric, measured_arm_cm numeric,
  measured_thigh_cm numeric, measured_calf_cm numeric, measured_triceps_mm numeric,
  measured_subscapular_mm numeric, measured_suprailiac_mm numeric, measured_abdominal_mm numeric
)
returns uuid language plpgsql security definer set search_path='' as $$
declare created_id uuid;
begin
  created_id := public.record_adult_anthropometry(target_patient_id, measured_weight_kg, measured_height_cm, now());
  update public.anthropometric_measurements set
    waist_cm=measured_waist_cm, hip_cm=measured_hip_cm,
    waist_hip_ratio=case when measured_waist_cm is not null and measured_hip_cm is not null then round(measured_waist_cm/measured_hip_cm,3) end,
    arm_cm=measured_arm_cm, thigh_cm=measured_thigh_cm, calf_cm=measured_calf_cm,
    triceps_skinfold_mm=measured_triceps_mm, subscapular_skinfold_mm=measured_subscapular_mm,
    suprailiac_skinfold_mm=measured_suprailiac_mm, abdominal_skinfold_mm=measured_abdominal_mm
  where id=created_id;
  return created_id;
end;
$$;
revoke all on function public.record_extended_adult_anthropometry(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) from public;
grant execute on function public.record_extended_adult_anthropometry(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;
