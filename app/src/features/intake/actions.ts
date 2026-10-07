"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { consumePublicBookingRateLimit } from "@/features/public-booking/rate-limit";

import {
  createIntakeInviteSchema,
  publicIntakeSchema,
  revokeIntakeInviteSchema,
  type IntakeFormState,
} from "./schemas";
import { createIntakeToken, hashIntakeToken, isIntakeToken } from "./token";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createIntakeInviteAction(
  _state: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist") {
    return { status: "error", message: "Se requiere acceso clínico." };
  }
  const parsed = createIntakeInviteSchema.safeParse({
    patientId: text(formData, "patientId"),
    expiryDays: text(formData, "expiryDays"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }
  const token = createIntakeToken();
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + parsed.data.expiryDays);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_intake_invite", {
    intake_expires_at: expiresAt.toISOString(),
    intake_token_hash: hashIntakeToken(token),
    target_patient_id: parsed.data.patientId,
  });
  if (error) {
    return { status: "error", message: "No pudimos crear el enlace." };
  }
  revalidatePath(`/pacientes/${parsed.data.patientId}/historia`);
  return {
    status: "success",
    message: "Enlace creado. Cópialo ahora; el token no se volverá a mostrar.",
    path: `/preconsulta/${token}`,
  };
}

export async function revokeIntakeInviteAction(
  inviteId: string,
  patientId: string,
) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist") return;
  const parsed = revokeIntakeInviteSchema.safeParse({ inviteId, patientId });
  if (!parsed.success) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("revoke_intake_invite", {
    target_invite_id: parsed.data.inviteId,
  });
  if (!error) revalidatePath(`/pacientes/${parsed.data.patientId}/historia`);
}

export async function submitPublicIntakeAction(
  token: string,
  _state: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const valueKeys = [
    "medicalHistory",
    "familyHistory",
    "allergies",
    "medications",
    "recall24h",
    "eatingHabits",
    "waterLiters",
    "sleepHours",
    "physicalActivity",
    "preferences",
    "restrictions",
  ] as const;
  const values = Object.fromEntries(
    valueKeys.map((key) => [key, text(formData, key)]),
  );
  const parsed = publicIntakeSchema.safeParse({
    ...values,
    consent: formData.get("consent"),
    consentVersion: text(formData, "consentVersion"),
  });
  if (!parsed.success || !isIntakeToken(token)) {
    return {
      status: "error",
      message: isIntakeToken(token)
        ? undefined
        : "Este enlace no está disponible.",
      errors: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
      values,
    };
  }
  const tokenHash = hashIntakeToken(token);
  const allowed = await consumePublicBookingRateLimit(
    `intake-submit:${tokenHash.slice(0, 24)}`,
    5,
    3600,
  );
  if (!allowed) {
    return {
      status: "error",
      message:
        "No pudimos procesar la información en este momento. Inténtalo más tarde.",
      values,
    };
  }
  const d = parsed.data;
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("submit_public_intake", {
    accepted_consent_version: d.consentVersion,
    intake_allergies: d.allergies,
    intake_eating_habits: d.eatingHabits,
    intake_family_history: d.familyHistory,
    intake_medical_history: d.medicalHistory,
    intake_medications: d.medications,
    intake_physical_activity: d.physicalActivity,
    intake_preferences: d.preferences,
    intake_recall_24h: d.recall24h,
    intake_restrictions: d.restrictions,
    intake_sleep_hours: d.sleepHours ?? null,
    intake_token_hash: tokenHash,
    intake_water_liters: d.waterLiters ?? null,
  });
  if (error) {
    return {
      status: "error",
      message:
        "Este enlace ya no está disponible. Solicita uno nuevo a la clínica.",
      values,
    };
  }
  return {
    status: "success",
    message:
      "La clínica recibió tu información para revisarla antes de la consulta.",
  };
}
