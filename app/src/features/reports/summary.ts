import type { Database } from "../../types/database";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];

export function calculateMonthlySummary({
  appointments,
  payments,
  packageSales,
  sessionsConsumed,
}: {
  appointments: Appointment[];
  payments: Payment[];
  packageSales: Array<{ total_sessions: number }>;
  sessionsConsumed: number;
}) {
  const statusCounts = appointments.reduce<Record<string, number>>(
    (counts, appointment) => ({
      ...counts,
      [appointment.status]: (counts[appointment.status] ?? 0) + 1,
    }),
    {},
  );
  const completed = statusCounts.completed ?? 0;
  const noShows = statusCounts.no_show ?? 0;
  const resolved = completed + noShows;
  return {
    appointmentCount: appointments.length,
    completedCount: completed,
    noShowCount: noShows,
    cancelledCount: statusCounts.cancelled ?? 0,
    noShowRate: resolved ? noShows / resolved : null,
    paidCentavos: payments
      .filter((payment) => payment.status === "paid")
      .reduce((total, payment) => total + payment.amount_centavos, 0),
    pendingCentavos: payments
      .filter((payment) => payment.status === "pending")
      .reduce((total, payment) => total + payment.amount_centavos, 0),
    packageSalesCount: packageSales.length,
    sessionsSold: packageSales.reduce(
      (total, patientPackage) => total + patientPackage.total_sessions,
      0,
    ),
    sessionsConsumed,
  };
}
