import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getEnergyCalculationContext(patientId: string) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return null;
  const supabase = await createServerSupabaseClient();
  const [{ data: patient }, { data: measurements }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name, birth_date, growth_reference_sex")
      .eq("id", patientId)
      .eq("organization_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("anthropometric_measurements")
      .select("id, measured_at, weight_kg, height_cm")
      .eq("patient_id", patientId)
      .eq("organization_id", workspace.id)
      .order("measured_at", { ascending: false })
      .limit(20),
  ]);
  if (!patient) return null;
  return { patient, measurements: measurements ?? [] };
}

export async function getEnergyCalculation(
  patientId: string,
  calculationId: string,
) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return null;
  const supabase = await createServerSupabaseClient();
  const { data: calculation } = await supabase
    .from("energy_calculations")
    .select("*")
    .eq("id", calculationId)
    .eq("patient_id", patientId)
    .eq("organization_id", workspace.id)
    .maybeSingle();
  if (!calculation) return null;
  const { data: patient } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .eq("id", patientId)
    .maybeSingle();
  await supabase.rpc("record_energy_calculation_read", {
    target_calculation_id: calculationId,
  });
  return { calculation, patient };
}

export async function getEnergyCalculationForMealPlan(calculationId: string) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("energy_calculations")
    .select(
      "id, patient_id, target_energy_kcal, target_protein_g, target_carbohydrate_g, target_fat_g",
    )
    .eq("id", calculationId)
    .eq("organization_id", workspace.id)
    .maybeSingle();
  return data;
}
