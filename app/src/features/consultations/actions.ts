"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  consultationCreateSchema,
  consultationDraftSchema,
  type ConsultationFormState,
} from "./schemas";

function canManageConsultations(role: string) {
  return role === "owner" || role === "nutritionist";
}

export async function createConsultationAction(
  _state: ConsultationFormState,
  formData: FormData,
): Promise<ConsultationFormState> {
  const { workspace } = await requireWorkspace();
  if (!canManageConsultations(workspace.role))
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  const parsed = consultationCreateSchema.safeParse({
    patientId: formData.get("patientId"),
    consultationType: formData.get("consultationType"),
    date: formData.get("date"),
    time: formData.get("time"),
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_consultation", {
    target_patient_id: parsed.data.patientId,
    requested_type: parsed.data.consultationType,
    consultation_time: `${parsed.data.date}T${parsed.data.time}:00`,
  });
  if (error || !data)
    return { status: "error", message: "No pudimos abrir la consulta." };

  revalidatePath(`/pacientes/${parsed.data.patientId}`);
  redirect(`/pacientes/${parsed.data.patientId}/consultas/${data}`);
}

export async function updateConsultationAction(
  state: ConsultationFormState,
  formData: FormData,
): Promise<ConsultationFormState> {
  const { workspace } = await requireWorkspace();
  if (!canManageConsultations(workspace.role))
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  const text = (name: string) => String(formData.get(name) ?? "");
  const values = {
    subjective: text("subjective"),
    objective: text("objective"),
    assessment: text("assessment"),
    plan: text("plan"),
    clinicalSummary: text("clinicalSummary"),
  };
  const parsed = consultationDraftSchema.safeParse({
    consultationId: formData.get("consultationId"),
    patientId: formData.get("patientId"),
    ...values,
  });
  const attempt = (state.attempt ?? 0) + 1;
  if (!parsed.success)
    return {
      status: "error",
      message: "Revisa los campos indicados.",
      errors: parsed.error.flatten().fieldErrors,
      values,
      attempt,
    };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_consultation_draft", {
    target_consultation_id: parsed.data.consultationId,
    note_subjective: parsed.data.subjective || null,
    note_objective: parsed.data.objective || null,
    note_assessment: parsed.data.assessment || null,
    note_plan: parsed.data.plan || null,
    note_clinical_summary: parsed.data.clinicalSummary || null,
  });
  if (error)
    return {
      status: "error",
      message: "No pudimos guardar la consulta en curso.",
      values,
      attempt,
    };
  revalidatePath(
    `/pacientes/${parsed.data.patientId}/consultas/${parsed.data.consultationId}`,
  );
  revalidatePath(`/pacientes/${parsed.data.patientId}`);
  return {
    status: "success",
    message: "Cambios guardados.",
    values,
    attempt,
  };
}

export async function completeConsultationAction(
  consultationId: string,
  patientId: string,
) {
  const { workspace } = await requireWorkspace();
  if (
    !canManageConsultations(workspace.role) ||
    !z.uuid().safeParse(consultationId).success ||
    !z.uuid().safeParse(patientId).success
  )
    return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("complete_consultation", {
    target_consultation_id: consultationId,
  });
  if (!error) {
    revalidatePath(`/pacientes/${patientId}/consultas/${consultationId}`);
    revalidatePath(`/pacientes/${patientId}`);
  }
}
