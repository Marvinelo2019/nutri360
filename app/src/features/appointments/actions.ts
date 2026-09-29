"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  appointmentSchema,
  appointmentStatusSchema,
  type AppointmentFormState,
} from "./schemas";

export async function createAppointmentAction(
  _state: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  await requireWorkspace();
  const parsed = appointmentSchema.safeParse({
    patientId: formData.get("patientId"),
    professionalUserId: formData.get("professionalUserId"),
    date: formData.get("date"),
    time: formData.get("time"),
    durationMinutes: formData.get("durationMinutes"),
    modality: formData.get("modality"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_appointment", {
    appointment_modality: parsed.data.modality,
    duration_minutes: parsed.data.durationMinutes,
    local_start: `${parsed.data.date}T${parsed.data.time}:00`,
    target_patient_id: parsed.data.patientId,
    target_professional_user_id: parsed.data.professionalUserId,
  });
  if (error) {
    const message = error.message.includes("already has")
      ? "El profesional ya tiene una cita en ese horario."
      : error.message.includes("past")
        ? "La cita debe programarse en un horario futuro."
        : "No pudimos programar la cita. Revisa los datos e inténtalo nuevamente.";
    return { status: "error", message };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect(`/agenda?fecha=${parsed.data.date}`);
}

export async function changeAppointmentStatusAction(
  appointmentId: string,
  nextStatus: Database["public"]["Enums"]["appointment_status"],
) {
  await requireWorkspace();
  const id = appointmentSchema.shape.patientId.safeParse(appointmentId);
  const status = appointmentStatusSchema.safeParse(nextStatus);
  if (!id.success || !status.success) return;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("change_appointment_status", {
    next_status: status.data,
    target_appointment_id: id.data,
  });
  if (!error) {
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
  }
}
