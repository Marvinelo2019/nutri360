import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { clinicDateKey } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getMonthlyPayments(monthDate = clinicDateKey()) {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { data: payments, error } = await supabase.rpc(
    "list_payments_for_local_month",
    { target_organization_id: workspace.id, target_month: monthDate },
  );
  if (error) throw error;
  const patientIds = [
    ...new Set(payments.map((payment) => payment.patient_id)),
  ];
  const { data: patients } = patientIds.length
    ? await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .in("id", patientIds)
    : { data: [] };
  const names = new Map(
    (patients ?? []).map((patient) => [patient.id, patient]),
  );
  return payments.map((payment) => ({
    ...payment,
    patient: names.get(payment.patient_id) ?? null,
  }));
}

export async function getPaymentPatients() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .eq("organization_id", workspace.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("first_name");
  if (error) throw error;
  return data;
}

export async function getMonthlyPaymentSummary() {
  const payments = await getMonthlyPayments();
  return {
    paidCentavos: payments
      .filter((payment) => payment.status === "paid")
      .reduce((total, payment) => total + payment.amount_centavos, 0),
    pendingCentavos: payments
      .filter((payment) => payment.status === "pending")
      .reduce((total, payment) => total + payment.amount_centavos, 0),
    count: payments.length,
  };
}
