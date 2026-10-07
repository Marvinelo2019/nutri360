import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { clinicDateKey } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { patientPackageDisplayState } from "./presentation";

export async function getPackageBalanceSummary() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { data: purchases, error: purchasesError } = await supabase
    .from("patient_packages")
    .select("id, total_sessions, status, expires_on")
    .eq("organization_id", workspace.id);
  if (purchasesError) throw purchasesError;

  const purchaseIds = purchases.map((purchase) => purchase.id);
  const { data: usages, error: usagesError } = purchaseIds.length
    ? await supabase
        .from("package_usages")
        .select("patient_package_id, session_delta")
        .in("patient_package_id", purchaseIds)
    : { data: [], error: null };
  if (usagesError) throw usagesError;

  const deltas = new Map<string, number>();
  for (const usage of usages ?? []) {
    deltas.set(
      usage.patient_package_id,
      (deltas.get(usage.patient_package_id) ?? 0) + usage.session_delta,
    );
  }
  const activeBalances = purchases
    .map((purchase) => {
      const remainingSessions =
        purchase.total_sessions + (deltas.get(purchase.id) ?? 0);
      return {
        remainingSessions,
        displayState: patientPackageDisplayState(purchase, remainingSessions),
      };
    })
    .filter((purchase) => purchase.displayState === "active");

  return {
    activePackageCount: activeBalances.length,
    availableSessions: activeBalances.reduce(
      (total, purchase) => total + purchase.remainingSessions,
      0,
    ),
  };
}

export async function getPackagesOverview() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const [
    { data: definitions, error: definitionsError },
    { data: purchases, error: purchasesError },
  ] = await Promise.all([
    supabase
      .from("packages")
      .select("*")
      .eq("organization_id", workspace.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("patient_packages")
      .select("*")
      .eq("organization_id", workspace.id)
      .order("created_at", { ascending: false }),
  ]);
  if (definitionsError) throw definitionsError;
  if (purchasesError) throw purchasesError;

  const purchaseIds = purchases.map((purchase) => purchase.id);
  const patientIds = [
    ...new Set(purchases.map((purchase) => purchase.patient_id)),
  ];
  const [
    { data: usages, error: usagesError },
    { data: patients, error: patientsError },
  ] = await Promise.all([
    purchaseIds.length
      ? supabase
          .from("package_usages")
          .select("patient_package_id, session_delta")
          .in("patient_package_id", purchaseIds)
      : Promise.resolve({ data: [], error: null }),
    patientIds.length
      ? supabase
          .from("patients")
          .select("id, first_name, last_name")
          .in("id", patientIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (usagesError) throw usagesError;
  if (patientsError) throw patientsError;

  const deltas = new Map<string, number>();
  for (const usage of usages ?? []) {
    deltas.set(
      usage.patient_package_id,
      (deltas.get(usage.patient_package_id) ?? 0) + usage.session_delta,
    );
  }
  const names = new Map(
    (patients ?? []).map((patient) => [patient.id, patient]),
  );
  const enrichedPurchases = purchases.map((purchase) => {
    const remainingSessions =
      purchase.total_sessions + (deltas.get(purchase.id) ?? 0);
    return {
      ...purchase,
      patient: names.get(purchase.patient_id) ?? null,
      remainingSessions,
      displayState: patientPackageDisplayState(purchase, remainingSessions),
    };
  });
  return { definitions, purchases: enrichedPurchases };
}

export async function getPackageSaleOptions() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const [
    { data: packages, error: packagesError },
    { data: patients, error: patientsError },
  ] = await Promise.all([
    supabase
      .from("packages")
      .select("id, name, session_count, price_centavos, validity_days")
      .eq("organization_id", workspace.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("organization_id", workspace.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("first_name"),
  ]);
  if (packagesError) throw packagesError;
  if (patientsError) throw patientsError;
  return { packages, patients };
}

export async function getPatientPackage(patientPackageId: string) {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { data: patientPackage, error } = await supabase
    .from("patient_packages")
    .select("*")
    .eq("id", patientPackageId)
    .eq("organization_id", workspace.id)
    .maybeSingle();
  if (error) throw error;
  if (!patientPackage) return null;

  const [
    { data: patient, error: patientError },
    { data: usages, error: usagesError },
    { data: appointments, error: appointmentsError },
    { data: payment, error: paymentError },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("id", patientPackage.patient_id)
      .single(),
    supabase
      .from("package_usages")
      .select("*")
      .eq("patient_package_id", patientPackage.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("id, starts_at, status")
      .eq("patient_id", patientPackage.patient_id)
      .eq("organization_id", workspace.id)
      .eq("status", "completed")
      .order("starts_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount_centavos, status, method, paid_at, created_at")
      .eq("patient_package_id", patientPackage.id)
      .maybeSingle(),
  ]);
  if (patientError) throw patientError;
  if (usagesError) throw usagesError;
  if (appointmentsError) throw appointmentsError;
  if (paymentError) throw paymentError;

  const usageRows = usages ?? [];
  const remainingSessions =
    patientPackage.total_sessions +
    usageRows.reduce((total, usage) => total + usage.session_delta, 0);
  const reversedIds = new Set(
    usageRows
      .filter((usage) => usage.kind === "reversal" && usage.reverses_usage_id)
      .map((usage) => usage.reverses_usage_id as string),
  );
  const activeAppointmentIds = new Set(
    usageRows
      .filter(
        (usage) => usage.kind === "consumption" && !reversedIds.has(usage.id),
      )
      .map((usage) => usage.appointment_id),
  );
  const appointmentsById = new Map(
    (appointments ?? []).map((appointment) => [appointment.id, appointment]),
  );
  return {
    patientPackage,
    patient,
    payment,
    remainingSessions,
    displayState: patientPackageDisplayState(patientPackage, remainingSessions),
    eligibleAppointments: (appointments ?? []).filter(
      (appointment) =>
        !activeAppointmentIds.has(appointment.id) &&
        clinicDateKey(new Date(appointment.starts_at)) >=
          patientPackage.purchased_on &&
        clinicDateKey(new Date(appointment.starts_at)) <=
          patientPackage.expires_on,
    ),
    usages: usageRows.map((usage) => ({
      ...usage,
      appointment: appointmentsById.get(usage.appointment_id) ?? null,
      isReversed: usage.kind === "consumption" && reversedIds.has(usage.id),
    })),
  };
}
