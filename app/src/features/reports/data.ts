import "server-only";

import { patientPackageDisplayState } from "@/features/packages/presentation";
import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { monthBounds, reportMonthSchema } from "./schemas";
import { calculateMonthlySummary } from "./summary";

export async function getMonthlyReport(requestedMonth: string) {
  const month = reportMonthSchema.parse(requestedMonth);
  const { firstDate, nextFirstDate } = monthBounds(month);
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();

  const [
    { data: organization, error: organizationError },
    { data: appointments, error: appointmentsError },
    { data: payments, error: paymentsError },
    { data: packageSales, error: packageSalesError },
    { data: professionals, error: professionalsError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, brand_color, timezone, currency")
      .eq("id", workspace.id)
      .single(),
    supabase.rpc("list_appointments_for_local_month", {
      target_organization_id: workspace.id,
      target_month: firstDate,
    }),
    supabase.rpc("list_payments_for_local_month", {
      target_organization_id: workspace.id,
      target_month: firstDate,
    }),
    supabase
      .from("patient_packages")
      .select("*")
      .eq("organization_id", workspace.id)
      .gte("purchased_on", firstDate)
      .lt("purchased_on", nextFirstDate)
      .order("purchased_on"),
    supabase.rpc("list_scheduling_professionals", {
      target_organization_id: workspace.id,
    }),
  ]);
  if (organizationError) throw organizationError;
  if (appointmentsError) throw appointmentsError;
  if (paymentsError) throw paymentsError;
  if (packageSalesError) throw packageSalesError;
  if (professionalsError) throw professionalsError;

  const appointmentIds = appointments.map((item) => item.id);
  const { data: monthlyUsages, error: monthlyUsagesError } =
    appointmentIds.length
      ? await supabase
          .from("package_usages")
          .select("*")
          .in("appointment_id", appointmentIds)
      : { data: [], error: null };
  if (monthlyUsagesError) throw monthlyUsagesError;

  const relatedPackageIds = [
    ...new Set([
      ...packageSales.map((item) => item.id),
      ...(monthlyUsages ?? []).map((usage) => usage.patient_package_id),
      ...payments
        .map((payment) => payment.patient_package_id)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];
  const soldIds = new Set(packageSales.map((item) => item.id));
  const missingPackageIds = relatedPackageIds.filter((id) => !soldIds.has(id));
  const { data: olderActivePackages, error: olderPackagesError } =
    missingPackageIds.length
      ? await supabase
          .from("patient_packages")
          .select("*")
          .in("id", missingPackageIds)
          .eq("organization_id", workspace.id)
      : { data: [], error: null };
  if (olderPackagesError) throw olderPackagesError;
  const reportPackages = [...packageSales, ...(olderActivePackages ?? [])];

  const { data: allRelatedUsages, error: allUsagesError } =
    relatedPackageIds.length
      ? await supabase
          .from("package_usages")
          .select("patient_package_id, session_delta")
          .in("patient_package_id", relatedPackageIds)
      : { data: [], error: null };
  if (allUsagesError) throw allUsagesError;

  const patientIds = [
    ...new Set([
      ...appointments.map((item) => item.patient_id),
      ...payments.map((item) => item.patient_id),
      ...reportPackages.map((item) => item.patient_id),
    ]),
  ];
  const { data: patients, error: patientsError } = patientIds.length
    ? await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .in("id", patientIds)
    : { data: [], error: null };
  if (patientsError) throw patientsError;

  const patientNames = new Map(
    (patients ?? []).map((patient) => [
      patient.id,
      `${patient.first_name} ${patient.last_name}`,
    ]),
  );
  const professionalNames = new Map(
    professionals.map((professional) => [
      professional.user_id,
      professional.full_name,
    ]),
  );
  const packageNames = new Map(
    reportPackages.map((item) => [item.id, item.package_name_snapshot]),
  );

  const reversedConsumptionIds = new Set(
    (monthlyUsages ?? [])
      .filter((usage) => usage.kind === "reversal" && usage.reverses_usage_id)
      .map((usage) => usage.reverses_usage_id as string),
  );
  const activeMonthlyConsumptions = (monthlyUsages ?? []).filter(
    (usage) =>
      usage.kind === "consumption" && !reversedConsumptionIds.has(usage.id),
  );
  const monthlyConsumptionByPackage = new Map<string, number>();
  for (const usage of activeMonthlyConsumptions) {
    monthlyConsumptionByPackage.set(
      usage.patient_package_id,
      (monthlyConsumptionByPackage.get(usage.patient_package_id) ?? 0) + 1,
    );
  }
  const lifetimeDeltas = new Map<string, number>();
  for (const usage of allRelatedUsages ?? []) {
    lifetimeDeltas.set(
      usage.patient_package_id,
      (lifetimeDeltas.get(usage.patient_package_id) ?? 0) + usage.session_delta,
    );
  }

  const appointmentRows = appointments.map((appointment) => ({
    ...appointment,
    patientName: patientNames.get(appointment.patient_id) ?? "Paciente",
    professionalName:
      professionalNames.get(appointment.professional_user_id) ?? "Profesional",
  }));
  const paymentRows = payments.map((payment) => ({
    ...payment,
    patientName: patientNames.get(payment.patient_id) ?? "Paciente",
    concept: payment.patient_package_id
      ? (packageNames.get(payment.patient_package_id) ?? "Paquete")
      : payment.appointment_id
        ? "Consulta"
        : "Pago general",
  }));
  const packageRows = reportPackages
    .map((patientPackage) => {
      const remainingSessions =
        patientPackage.total_sessions +
        (lifetimeDeltas.get(patientPackage.id) ?? 0);
      return {
        ...patientPackage,
        patientName: patientNames.get(patientPackage.patient_id) ?? "Paciente",
        remainingSessions,
        sessionsConsumedInMonth:
          monthlyConsumptionByPackage.get(patientPackage.id) ?? 0,
        displayState: patientPackageDisplayState(
          patientPackage,
          remainingSessions,
        ),
        soldInSelectedMonth:
          patientPackage.purchased_on >= firstDate &&
          patientPackage.purchased_on < nextFirstDate,
      };
    })
    .sort((left, right) => left.purchased_on.localeCompare(right.purchased_on));

  const summary = calculateMonthlySummary({
    appointments,
    payments,
    packageSales,
    sessionsConsumed: activeMonthlyConsumptions.length,
  });
  return {
    month,
    organization,
    summary,
    appointments: appointmentRows,
    payments: paymentRows,
    packages: packageRows,
  };
}
