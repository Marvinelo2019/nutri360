import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { patientPackageDisplayState } from "../packages/presentation";

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
  const { data: patientPackages, error: patientPackagesError } = await supabase
    .from("patient_packages")
    .select("*")
    .eq("patient_id", patientId)
    .eq("organization_id", workspace.id)
    .order("created_at", { ascending: false });
  if (patientPackagesError) throw patientPackagesError;
  const packageIds = patientPackages.map((item) => item.id);
  const { data: packageUsages, error: packageUsagesError } = packageIds.length
    ? await supabase
        .from("package_usages")
        .select("patient_package_id, session_delta")
        .in("patient_package_id", packageIds)
    : { data: [], error: null };
  if (packageUsagesError) throw packageUsagesError;
  const packageDeltas = new Map<string, number>();
  for (const usage of packageUsages ?? []) {
    packageDeltas.set(
      usage.patient_package_id,
      (packageDeltas.get(usage.patient_package_id) ?? 0) + usage.session_delta,
    );
  }
  const packageSummaries = patientPackages.map((item) => {
    const remainingSessions =
      item.total_sessions + (packageDeltas.get(item.id) ?? 0);
    return {
      ...item,
      remainingSessions,
      displayState: patientPackageDisplayState(item, remainingSessions),
    };
  });
  const canViewClinical =
    workspace.role === "owner" || workspace.role === "nutritionist";
  if (!canViewClinical)
    return {
      patient,
      clinical: null,
      consent: null,
      measurements: [],
      consultations: [],
      energyCalculations: [],
      patientPackages: packageSummaries,
      canViewClinical,
    };

  const [
    { data: clinical },
    { data: consent },
    { data: measurements },
    { data: consultations },
    { data: energyCalculations },
  ] = await Promise.all([
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
    supabase
      .from("consultations")
      .select(
        "id, consultation_type, status, occurred_at, clinical_summary, updated_at",
      )
      .eq("patient_id", patientId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("energy_calculations")
      .select(
        "id, formula, target_energy_kcal, target_protein_g, target_carbohydrate_g, target_fat_g, created_at",
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
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
    supabase.rpc("record_clinical_read", {
      target_patient_id: patientId,
      target_entity_type: "consultations",
    }),
    supabase.rpc("record_clinical_read", {
      target_patient_id: patientId,
      target_entity_type: "energy_calculations",
    }),
  ]);

  return {
    patient,
    clinical,
    consent,
    measurements: measurements ?? [],
    consultations: consultations ?? [],
    energyCalculations: energyCalculations ?? [],
    patientPackages: packageSummaries,
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
