"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  clinicalHistorySchema,
  labResultSchema,
  type ClinicalHistoryState,
} from "./schemas";

function isClinician(role: string) {
  return role === "owner" || role === "nutritionist";
}

export async function saveClinicalHistoryAction(
  _state: ClinicalHistoryState,
  formData: FormData,
): Promise<ClinicalHistoryState> {
  const { workspace } = await requireWorkspace();
  if (!isClinician(workspace.role))
    return { status: "error", message: "Se requiere acceso clínico." };
  const parsed = clinicalHistorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("save_patient_histories", {
    target_patient_id: d.patientId,
    history_medical: d.medicalHistory || null,
    history_diagnoses: d.diagnoses || null,
    history_family: d.familyHistory || null,
    history_allergies: d.allergies || null,
    history_medications: d.medications || null,
    dietary_recall_24h: d.recall24h || null,
    dietary_eating_habits: d.eatingHabits || null,
    dietary_water_liters: d.waterLiters ?? null,
    dietary_sleep_hours: d.sleepHours ?? null,
    dietary_physical_activity: d.physicalActivity || null,
    dietary_preferences: d.preferences || null,
    dietary_restrictions: d.restrictions || null,
  });
  if (error)
    return {
      status: "error",
      message: "No pudimos guardar la historia clínica.",
    };
  revalidatePath(`/pacientes/${d.patientId}`);
  revalidatePath(`/pacientes/${d.patientId}/historia`);
  return { status: "success", message: "Historia clínica actualizada." };
}

export async function recordLabResultAction(
  _state: ClinicalHistoryState,
  formData: FormData,
): Promise<ClinicalHistoryState> {
  const { workspace } = await requireWorkspace();
  if (!isClinician(workspace.role))
    return { status: "error", message: "Se requiere acceso clínico." };
  const parsed = labResultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("record_lab_result", {
    target_patient_id: d.patientId,
    laboratory_test_name: d.testName,
    laboratory_result_value: d.resultValue,
    laboratory_unit: d.unit,
    laboratory_reference_min: d.referenceMin ?? null,
    laboratory_reference_max: d.referenceMax ?? null,
    laboratory_collected_on: d.collectedOn,
    laboratory_notes: d.notes || null,
  });
  if (error)
    return { status: "error", message: "No pudimos registrar el resultado." };
  revalidatePath(`/pacientes/${d.patientId}/historia`);
  return { status: "success", message: "Resultado registrado." };
}
