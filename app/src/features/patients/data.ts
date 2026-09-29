import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listPatients() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("patients")
    .select(
      "id, first_name, last_name, birth_date, phone_e164, email, status, created_at",
    )
    .eq("organization_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPatient(patientId: string) {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .eq("organization_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) return null;
  const canViewClinical =
    workspace.role === "owner" || workspace.role === "nutritionist";
  if (!canViewClinical)
    return {
      patient,
      clinical: null,
      consent: null,
      measurements: [],
      canViewClinical,
    };

  const [{ data: clinical }, { data: consent }, { data: measurements }] =
    await Promise.all([
      supabase
        .from("patient_clinical_profiles")
        .select("goal, consultation_reason")
        .eq("patient_id", patientId)
        .maybeSingle(),
      supabase
        .from("patient_consents")
        .select("accepted_at, consent_version, withdrawn_at")
        .eq("patient_id", patientId)
        .is("withdrawn_at", null)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("anthropometric_measurements")
        .select("*")
        .eq("patient_id", patientId)
        .order("measured_at", { ascending: false }),
    ]);

  await Promise.all([
    supabase.rpc("record_clinical_read", {
      target_patient_id: patientId,
      target_entity_type: "patient_clinical_profile",
    }),
    supabase.rpc("record_clinical_read", {
      target_patient_id: patientId,
      target_entity_type: "anthropometric_measurements",
    }),
  ]);

  return {
    patient,
    clinical,
    consent,
    measurements: measurements ?? [],
    canViewClinical,
  };
}

export async function getPatientCount() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", workspace.id)
    .eq("status", "active")
    .is("deleted_at", null);
  return count ?? 0;
}
