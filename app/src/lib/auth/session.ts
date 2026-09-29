import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getCurrentContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data: claimData, error: claimError } =
    await supabase.auth.getClaims();
  const userId = claimData?.claims.sub;

  if (claimError || typeof userId !== "string") {
    return null;
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  // A locally reset or remotely revoked account can leave a still-valid JWT
  // in the browser. A profile is created transactionally for every real user,
  // so its absence means the session must not enter onboarding.
  if (!profile) {
    return null;
  }

  if (!membership) {
    return {
      userId,
      fullName: profile.full_name,
      workspace: null,
    };
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug, brand_color")
    .eq("id", membership.organization_id)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    userId,
    fullName: profile.full_name,
    workspace: organization ? { ...organization, role: membership.role } : null,
  };
});

export async function requireIdentity() {
  const context = await getCurrentContext();
  if (!context) redirect("/login");
  return context;
}

export async function requireWorkspace() {
  const context = await requireIdentity();
  if (!context.workspace) redirect("/onboarding");
  return { ...context, workspace: context.workspace };
}
