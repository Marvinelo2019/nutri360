"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  energyCalculationSchema,
  type EnergyCalculationFormState,
} from "./schemas";

export async function createEnergyCalculationAction(
  state: EnergyCalculationFormState,
  formData: FormData,
): Promise<EnergyCalculationFormState> {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist") {
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  }

  const value = (field: string) => String(formData.get(field) ?? "");
  const values = {
    measurementId: value("measurementId"),
    formula: value("formula"),
    activityFactor: value("activityFactor"),
    goalAdjustmentKcal: value("goalAdjustmentKcal"),
    macroMethod: value("macroMethod"),
    proteinInput: value("proteinInput"),
    carbohydrateInput: value("carbohydrateInput"),
    fatInput: value("fatInput"),
  };
  const parsed = energyCalculationSchema.safeParse({
    patientId: formData.get("patientId"),
    ...values,
  });
  const attempt = (state.attempt ?? 0) + 1;
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los parámetros antes de calcular.",
      errors: parsed.error.flatten().fieldErrors,
      values,
      attempt,
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_energy_calculation", {
    target_patient_id: parsed.data.patientId,
    source_measurement_id: parsed.data.measurementId,
    selected_formula: parsed.data.formula,
    selected_activity_factor: parsed.data.activityFactor,
    selected_goal_adjustment_kcal: parsed.data.goalAdjustmentKcal,
    selected_macro_method: parsed.data.macroMethod,
    selected_protein: parsed.data.proteinInput,
    selected_carbohydrate: parsed.data.carbohydrateInput,
    selected_fat: parsed.data.fatInput,
  });

  if (error || !data) {
    const knownMessage = error?.message.includes("Reference sex")
      ? "Completa el sexo de referencia del paciente antes de calcular."
      : error?.message.includes("age 18")
        ? "Este cálculo está disponible únicamente para pacientes adultos."
        : error?.message.includes("measurement")
          ? "La medición seleccionada no pertenece a este paciente."
          : "No pudimos guardar el cálculo nutricional.";
    return {
      status: "error",
      message: knownMessage,
      values,
      attempt,
    };
  }

  revalidatePath(`/pacientes/${parsed.data.patientId}`);
  redirect(`/pacientes/${parsed.data.patientId}/calculos/${data}`);
}
