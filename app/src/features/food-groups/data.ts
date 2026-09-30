import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listFoodGroups({ activeOnly = false } = {}) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return [];
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("food_groups")
    .select("*")
    .eq("organization_id", workspace.id)
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getFoodGroup(groupId: string) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("food_groups")
    .select("*")
    .eq("id", groupId)
    .eq("organization_id", workspace.id)
    .maybeSingle();
  return data;
}
