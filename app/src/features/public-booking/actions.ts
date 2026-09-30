"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { consumePublicBookingRateLimit } from "./rate-limit";
import {
  availabilityBlockSchema,
  availabilityRuleSchema,
  bookingSettingsSchema,
  publicBookingSchema,
  type BookingFormState,
} from "./schemas";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function savePublicBookingSettingsAction(
  _state: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const { workspace } = await requireWorkspace();
  const parsed = bookingSettingsSchema.safeParse({
    durationMinutes: text(formData, "durationMinutes"),
    enabled: formData.get("enabled") === "on",
    horizonDays: text(formData, "horizonDays"),
    instructions: text(formData, "instructions"),
    modality: text(formData, "modality"),
    noticeHours: text(formData, "noticeHours"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("save_public_booking_settings", {
    booking_enabled: parsed.data.enabled,
    booking_instructions: parsed.data.instructions || null,
    booking_modality: parsed.data.modality,
    duration_minutes: parsed.data.durationMinutes,
    horizon_days: parsed.data.horizonDays,
    notice_hours: parsed.data.noticeHours,
    target_organization_id: workspace.id,
  });
  if (error) {
    return {
      status: "error",
      message: "No pudimos guardar la configuración de reservas.",
    };
  }
  revalidatePath("/agenda/configuracion");
  revalidatePath(`/reservar/${workspace.slug}`);
  return { status: "success", message: "Configuración guardada." };
}

export async function createAvailabilityRuleAction(
  _state: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const { workspace } = await requireWorkspace();
  const parsed = availabilityRuleSchema.safeParse({
    endTime: text(formData, "endTime"),
    professionalUserId: text(formData, "professionalUserId"),
    startTime: text(formData, "startTime"),
    weekday: text(formData, "weekday"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_availability_rule", {
    local_end: parsed.data.endTime,
    local_start: parsed.data.startTime,
    target_organization_id: workspace.id,
    target_professional_user_id: parsed.data.professionalUserId,
    weekday: parsed.data.weekday,
  });
  if (error) {
    return {
      status: "error",
      message: error.message.includes("overlap")
        ? "Ese horario se cruza con otro horario configurado."
        : "No pudimos agregar el horario.",
    };
  }
  revalidatePath("/agenda/configuracion");
  revalidatePath(`/reservar/${workspace.slug}`);
  return { status: "success", message: "Horario agregado." };
}

export async function deleteAvailabilityRuleAction(ruleId: string) {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("delete_availability_rule", {
    target_rule_id: ruleId,
  });
  if (!error) {
    revalidatePath("/agenda/configuracion");
    revalidatePath(`/reservar/${workspace.slug}`);
  }
}

export async function createAvailabilityBlockAction(
  _state: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const { workspace } = await requireWorkspace();
  const parsed = availabilityBlockSchema.safeParse({
    endsAt: text(formData, "endsAt"),
    label: text(formData, "label"),
    professionalUserId: text(formData, "professionalUserId"),
    startsAt: text(formData, "startsAt"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_availability_block", {
    block_label: parsed.data.label || null,
    local_end: parsed.data.endsAt,
    local_start: parsed.data.startsAt,
    target_organization_id: workspace.id,
    target_professional_user_id: parsed.data.professionalUserId,
  });
  if (error) {
    return { status: "error", message: "No pudimos agregar el bloqueo." };
  }
  revalidatePath("/agenda/configuracion");
  revalidatePath(`/reservar/${workspace.slug}`);
  return { status: "success", message: "Bloqueo agregado." };
}

export async function deleteAvailabilityBlockAction(blockId: string) {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("delete_availability_block", {
    target_block_id: blockId,
  });
  if (!error) {
    revalidatePath("/agenda/configuracion");
    revalidatePath(`/reservar/${workspace.slug}`);
  }
}

export async function createPublicBookingAction(
  slug: string,
  _state: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values = {
    birthDate: text(formData, "birthDate"),
    email: text(formData, "email"),
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    phone: text(formData, "phone"),
  };
  const parsed = publicBookingSchema.safeParse({
    ...values,
    consent: formData.get("consent"),
    professionalUserId: text(formData, "professionalUserId"),
    startsAt: text(formData, "startsAt"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      values,
    };
  }
  const allowed = await consumePublicBookingRateLimit(
    `booking:${slug}`,
    5,
    3600,
  );
  if (!allowed) {
    return {
      status: "error",
      message:
        "No pudimos procesar la solicitud en este momento. Inténtalo más tarde.",
      values,
    };
  }
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("create_public_booking", {
    booking_slug: slug,
    patient_birth_date: parsed.data.birthDate,
    patient_email: parsed.data.email || null,
    patient_first_name: parsed.data.firstName,
    patient_last_name: parsed.data.lastName,
    patient_phone_e164: parsed.data.phone,
    selected_start: parsed.data.startsAt,
    target_professional_user_id: parsed.data.professionalUserId,
  });
  if (error) {
    return {
      status: "error",
      message:
        "Ese horario ya no está disponible. Actualiza la página y selecciona otro.",
      values,
    };
  }
  revalidatePath(`/reservar/${slug}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: "Tu solicitud fue enviada. La clínica deberá confirmar la cita.",
  };
}
