import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getClinicalHistory(patientId: string) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return null;
  const supabase = await createServerSupabaseClient();
  const [
    { data: patient },
    { data: health },
    { data: dietary },
    { data: labs },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("id", patientId)
      .eq("organization_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("patient_health_histories")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle(),
    supabase
      .from("dietary_histories")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle(),
    supabase
      .from("lab_results")
      .select("*")
      .eq("patient_id", patientId)
      .order("collected_on", { ascending: false }),
  ]);
  if (!patient) return null;
  await supabase.rpc("record_clinical_read", {
    target_patient_id: patientId,
    target_entity_type: "clinical_histories_and_labs",
  });
  return { patient, health, dietary, labs: labs ?? [] };
}
