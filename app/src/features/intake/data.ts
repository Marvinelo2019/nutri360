import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { consumePublicBookingRateLimit } from "@/features/public-booking/rate-limit";

import { hashIntakeToken, isIntakeToken } from "./token";

export async function getPatientIntakeRecords(patientId: string) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return null;
  const supabase = await createServerSupabaseClient();
  const [
    { data: invites, error: inviteError },
    { data: submissions, error: submissionError },
  ] = await Promise.all([
    supabase
      .from("intake_invites")
      .select(
        "id, patient_id, consent_version, expires_at, completed_at, revoked_at, created_at",
      )
      .eq("organization_id", workspace.id)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("intake_submissions")
      .select("*")
      .eq("organization_id", workspace.id)
      .eq("patient_id", patientId)
      .order("submitted_at", { ascending: false }),
  ]);
  if (inviteError || submissionError) throw inviteError ?? submissionError;
  return { invites: invites ?? [], submissions: submissions ?? [] };
}

export async function getPublicIntakeData(token: string) {
  if (!isIntakeToken(token)) return null;
  const tokenHash = hashIntakeToken(token);
  const allowed = await consumePublicBookingRateLimit(
    `intake-view:${tokenHash.slice(0, 24)}`,
    30,
    300,
  );
  if (!allowed) return null;
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .rpc("get_public_intake_context", { intake_token_hash: tokenHash })
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
