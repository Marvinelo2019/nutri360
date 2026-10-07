"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/session";
import {
  getGoogleCalendarEnv,
  isGoogleCalendarConfigured,
} from "@/lib/env/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { decryptSecret } from "./crypto";
import { revokeGoogleToken } from "./google-api";
import { processGoogleCalendarSync } from "./worker";

function canManageCalendar(role: string) {
  return role === "owner" || role === "nutritionist";
}

export async function syncGoogleCalendarAction() {
  const { userId, workspace } = await requireWorkspace();
  if (!canManageCalendar(workspace.role) || !isGoogleCalendarConfigured())
    return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("queue_google_calendar_sync", {
    target_organization_id: workspace.id,
  });
  if (error) return;
  const admin = createAdminSupabaseClient();
  const { data: connection } = await admin
    .from("google_calendar_connections")
    .select("id")
    .eq("organization_id", workspace.id)
    .eq("professional_user_id", userId)
    .maybeSingle();
  if (connection) {
    await processGoogleCalendarSync({ connectionId: connection.id }).catch(
      () => undefined,
    );
  }
  revalidatePath("/agenda");
  revalidatePath("/agenda/configuracion");
}

export async function disconnectGoogleCalendarAction() {
  const { userId, workspace } = await requireWorkspace();
  if (!canManageCalendar(workspace.role)) return;
  const admin = createAdminSupabaseClient();
  const { data: connection } = await admin
    .from("google_calendar_connections")
    .select(
      "refresh_token_ciphertext, refresh_token_iv, refresh_token_auth_tag",
    )
    .eq("organization_id", workspace.id)
    .eq("professional_user_id", userId)
    .maybeSingle();
  if (connection && isGoogleCalendarConfigured()) {
    try {
      const env = getGoogleCalendarEnv();
      const refreshToken = decryptSecret(
        {
          authTag: connection.refresh_token_auth_tag,
          ciphertext: connection.refresh_token_ciphertext,
          iv: connection.refresh_token_iv,
        },
        env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY,
      );
      await revokeGoogleToken(refreshToken);
    } catch {
      // Removing the local credential remains the safe fallback.
    }
  }
  await admin.rpc("disconnect_google_calendar", {
    target_organization_id: workspace.id,
    target_professional_user_id: userId,
  });
  revalidatePath("/agenda/configuracion");
}
