import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getConsultation(
  patientId: string,
  consultationId: string,
) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return null;
  const supabase = await createServerSupabaseClient();
  const [{ data: patient }, { data: consultation }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("id", patientId)
      .eq("organization_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("consultations")
      .select("*")
      .eq("id", consultationId)
      .eq("patient_id", patientId)
      .eq("organization_id", workspace.id)
      .maybeSingle(),
  ]);
  if (!patient || !consultation) return null;
  const { data: previous } = await supabase
    .from("consultations")
    .select("id, occurred_at, assessment, plan, clinical_summary")
    .eq("patient_id", patientId)
    .eq("status", "completed")
    .lt("occurred_at", consultation.occurred_at)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase.rpc("record_consultation_read", {
    target_consultation_id: consultationId,
  });
  return { patient, consultation, previous };
}
