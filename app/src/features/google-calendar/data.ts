import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { isGoogleCalendarConfigured } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getGoogleCalendarConfiguration() {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant") {
    return { configured: false, connection: null };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("get_google_calendar_connection_status", {
      target_organization_id: workspace.id,
    })
    .maybeSingle();
  if (error) throw error;
  return {
    configured: isGoogleCalendarConfigured(),
    connection: data,
  };
}
