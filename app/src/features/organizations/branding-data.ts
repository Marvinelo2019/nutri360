import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getOrganizationBranding() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, brand_color, phone_e164, logo_path")
    .eq("id", workspace.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
