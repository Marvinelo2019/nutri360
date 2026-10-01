"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { reminderSettingsSchema, type ReminderSettingsState } from "./schemas";

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
