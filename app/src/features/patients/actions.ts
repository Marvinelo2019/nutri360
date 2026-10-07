"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  adultMeasurementSchema,
  measurementSchema,
  patientSchema,
  type MeasurementFormState,
  type PatientFormState,
} from "./schemas";
import { isUnder18 } from "./paediatric-growth";

export async function createPatientAction(
  _state: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const { workspace } = await requireWorkspace();
  const parsed = patientSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate"),
    growthReferenceSex: formData.get("growthReferenceSex") || undefined,
    phone: formData.get("phone"),
    email: formData.get("email"),
    goal: formData.get("goal") || undefined,
    consultationReason: formData.get("consultationReason") || undefined,
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  if (
    workspace.role === "assistant" &&
    (parsed.data.goal || parsed.data.consultationReason)
  ) {
    return {
      status: "error",
      message: "El perfil clínico debe registrarlo un nutricionista.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_patient", {
    accepted_consent: true,
    patient_birth_date: parsed.data.birthDate,
    patient_consultation_reason: parsed.data.consultationReason || null,
    patient_email: parsed.data.email || null,
    patient_first_name: parsed.data.firstName,
    patient_goal: parsed.data.goal || null,
    patient_growth_reference_sex: parsed.data.growthReferenceSex ?? null,
    patient_last_name: parsed.data.lastName,
    patient_phone_e164: parsed.data.phone || null,
    target_organization_id: workspace.id,
  });

  if (error || !data) {
    return {
      status: "error",
      message:
        "No pudimos guardar al paciente. Revisa los datos e inténtalo de nuevo.",
    };
  }

  revalidatePath("/pacientes");
  redirect(`/pacientes/${data}`);
}

export async function recordMeasurementAction(
  _state: MeasurementFormState,
  formData: FormData,
): Promise<MeasurementFormState> {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist") {
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  }

  const parsed = measurementSchema.safeParse({
    patientId: formData.get("patientId"),
    weightKg: formData.get("weightKg"),
    heightCm: formData.get("heightCm"),
    waistCm: formData.get("waistCm"),
    hipCm: formData.get("hipCm"),
    armCm: formData.get("armCm"),
    thighCm: formData.get("thighCm"),
    calfCm: formData.get("calfCm"),
    tricepsMm: formData.get("tricepsMm"),
    subscapularMm: formData.get("subscapularMm"),
    suprailiacMm: formData.get("suprailiacMm"),
    abdominalMm: formData.get("abdominalMm"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createServerSupabaseClient();
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("birth_date")
    .eq("id", parsed.data.patientId)
    .eq("organization_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (patientError || !patient) {
    return { status: "error", message: "No encontramos al paciente." };
  }

  const isPaediatric = isUnder18(patient.birth_date);

  if (isPaediatric) {
    const hasAdultOnlyMeasurements = [
      parsed.data.waistCm,
      parsed.data.hipCm,
      parsed.data.armCm,
      parsed.data.thighCm,
      parsed.data.calfCm,
      parsed.data.tricepsMm,
      parsed.data.subscapularMm,
      parsed.data.suprailiacMm,
      parsed.data.abdominalMm,
    ].some((value) => value !== undefined);
    if (hasAdultOnlyMeasurements) {
      return {
        status: "error",
        message: "En pacientes pediátricos registra únicamente peso y talla.",
      };
    }
    const { error } = await supabase.rpc("record_paediatric_anthropometry", {
      target_patient_id: parsed.data.patientId,
      measured_weight_kg: parsed.data.weightKg,
      measured_height_cm: parsed.data.heightCm,
    });
    if (error) {
      return {
        status: "error",
        message: error.message.includes("reference sex")
          ? "Selecciona el sexo de referencia del paciente antes de calcular su crecimiento."
          : "No pudimos calcular los indicadores de crecimiento.",
      };
    }
    revalidatePath(`/pacientes/${parsed.data.patientId}`);
    revalidatePath("/dashboard");
    return {
      status: "success",
      message: "Medición pediátrica guardada con referencia OMS.",
    };
  }

  const adultParsed = adultMeasurementSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!adultParsed.success) {
    return { status: "error", errors: adultParsed.error.flatten().fieldErrors };
  }
  const { error } = await supabase.rpc("record_extended_adult_anthropometry", {
    target_patient_id: adultParsed.data.patientId,
    measured_weight_kg: adultParsed.data.weightKg,
    measured_height_cm: adultParsed.data.heightCm,
    measured_waist_cm: adultParsed.data.waistCm ?? null,
    measured_hip_cm: adultParsed.data.hipCm ?? null,
    measured_arm_cm: adultParsed.data.armCm ?? null,
    measured_thigh_cm: adultParsed.data.thighCm ?? null,
    measured_calf_cm: adultParsed.data.calfCm ?? null,
    measured_triceps_mm: adultParsed.data.tricepsMm ?? null,
    measured_subscapular_mm: adultParsed.data.subscapularMm ?? null,
    measured_suprailiac_mm: adultParsed.data.suprailiacMm ?? null,
    measured_abdominal_mm: adultParsed.data.abdominalMm ?? null,
  });
  if (error) {
    return {
      status: "error",
      message: error.message.includes("age 18")
        ? "El cálculo disponible en esta etapa es únicamente para pacientes de 18 años o más."
        : "No pudimos guardar la medición.",
    };
  }

  revalidatePath(`/pacientes/${parsed.data.patientId}`);
  revalidatePath("/dashboard");
  return { status: "success", message: "Medición guardada en el historial." };
}
