"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  reminderSettingsSchema,
  type ReminderSettingsState,
  type SandboxTestState,
} from "./schemas";
import { processTwilioSandboxReminders } from "./twilio-sandbox";

export async function saveReminderSettingsAction(
  _state: ReminderSettingsState,
  formData: FormData,
): Promise<ReminderSettingsState> {
  const { workspace } = await requireWorkspace();
  const parsed = reminderSettingsSchema.safeParse({
    channel: formData.get("channel"),
    confirmationEnabled: formData.get("confirmationEnabled") === "on",
    reminder24hEnabled: formData.get("reminder24hEnabled") === "on",
    reminder2hEnabled: formData.get("reminder2hEnabled") === "on",
  });
  if (!parsed.success) {
    return { status: "error", message: "Revisa la configuración elegida." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("save_reminder_settings", {
    enable_24h: parsed.data.reminder24hEnabled,
    enable_2h: parsed.data.reminder2hEnabled,
    enable_confirmation: parsed.data.confirmationEnabled,
    reminder_channel: parsed.data.channel,
    target_organization_id: workspace.id,
  });
  if (error) {
    return {
      status: "error",
      message: "No pudimos guardar la configuración de recordatorios.",
    };
  }

  revalidatePath("/agenda/recordatorios");
  return { status: "success", message: "Configuración guardada." };
}

export async function runTwilioSandboxOnceAction(
  _state: SandboxTestState,
  _formData: FormData,
): Promise<SandboxTestState> {
  void _state;
  void _formData;
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist") {
    return { status: "error", message: "No tienes permiso para esta prueba." };
  }

  try {
    const result = await processTwilioSandboxReminders(workspace.id);
    revalidatePath("/agenda/recordatorios");
    if (!result.claimed) {
      return {
        status: "error",
        message:
          "No hay un recordatorio vencido para el número de prueba configurado.",
      };
    }
    if (result.sent) {
      return {
        status: "success",
        message: "Twilio aceptó el recordatorio de prueba.",
      };
    }
    return {
      status: "error",
      message: "Twilio rechazó el envío; Nutri360 lo dejó para reintento.",
    };
  } catch {
    return {
      status: "error",
      message: "El Sandbox todavía no está configurado correctamente.",
    };
  }
}
