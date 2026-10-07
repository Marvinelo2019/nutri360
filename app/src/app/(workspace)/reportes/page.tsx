import Link from "next/link";

import { Icon } from "@/components/icon";
import { appointmentStatusLabels } from "@/features/appointments/presentation";
import { getMonthlyReport } from "@/features/reports/data";
import { reportMonthSchema } from "@/features/reports/schemas";
import { clinicDateKey, formatCurrency } from "@/lib/format";
import type { Database } from "@/types/database";

export const metadata = { title: "Reportes" };

type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

const statuses: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
  "rescheduled",
];

function percent(value: number | null) {
  return value === null
    ? "Sin datos"
    : new Intl.NumberFormat("es-GT", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const currentMonth = clinicDateKey().slice(0, 7);
  const month = reportMonthSchema.safeParse(mes).success ? mes! : currentMonth;
  const report = await getMonthlyReport(month);
  const monthLabel = new Intl.DateTimeFormat("es-GT", {
    month: "long",
    year: "numeric",
    timeZone: report.organization.timezone,
  }).format(new Date(`${month}-01T12:00:00Z`));
  const statusCounts = new Map<AppointmentStatus, number>();
  for (const appointment of report.appointments) {
    statusCounts.set(
      appointment.status,
      (statusCounts.get(appointment.status) ?? 0) + 1,
    );
  }
  const hasActivity =
    report.appointments.length > 0 ||
    report.payments.length > 0 ||
    report.packages.length > 0;

  return (
    <div className="mx-auto max-w-[88rem]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Seguimiento del negocio</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Reporte mensual
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Citas, ingresos y paquetes conciliados para {monthLabel}.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <form className="flex items-end gap-2" method="get">
            <div>
              <label className="field-label" htmlFor="mes">
                Mes
              </label>
              <input
                className="field-input min-w-44"
                defaultValue={month}
                id="mes"
                name="mes"
                type="month"
              />
            </div>
            <button className="button-secondary min-h-12" type="submit">
              Ver reporte
            </button>
          </form>
          <Link
            className="button-primary"
            href={`/reportes/exportar?month=${month}`}
          >
            <Icon name="payments" className="size-4" />
            Descargar Excel
          </Link>
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Citas</p>
          <p className="mt-4 text-2xl font-semibold">
            {report.summary.appointmentCount}
          </p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {report.summary.completedCount} atendidas
          </p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Tasa de ausencias</p>
          <p className="mt-4 text-2xl font-semibold">
            {percent(report.summary.noShowRate)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {report.summary.noShowCount} no asistieron
          </p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Ingresos pagados</p>
          <p className="mt-4 text-2xl font-semibold">
            {formatCurrency(report.summary.paidCentavos)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {formatCurrency(report.summary.pendingCentavos)} pendientes
          </p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Paquetes vendidos</p>
          <p className="mt-4 text-2xl font-semibold">
            {report.summary.packageSalesCount}
          </p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {report.summary.sessionsSold} sesiones vendidas
          </p>
        </article>
      </section>

      {!hasActivity ? (
        <section className="panel mt-5 grid min-h-72 place-items-center px-6 text-center">
          <div className="max-w-sm">
            <Icon
              name="dashboard"
              className="mx-auto size-7 text-[var(--brand-700)]"
            />
            <h2 className="mt-4 font-semibold">Sin actividad en este mes</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Selecciona otro mes o registra citas, pagos y ventas para ver su
              resumen.
            </p>
          </div>
        </section>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Estado de citas</h2>
                <p className="panel-description">Todas las citas del mes</p>
              </div>
            </div>
            <dl className="divide-y divide-[var(--line)]">
              {statuses.map((status) => (
                <div
                  className="flex items-center justify-between px-5 py-3.5 sm:px-6"
                  key={status}
                >
                  <dt className="text-sm text-[var(--text-muted)]">
                    {appointmentStatusLabels[status]}
                  </dt>
                  <dd className="text-sm font-semibold">
                    {statusCounts.get(status) ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Pagos</h2>
                <p className="panel-description">Por fecha efectiva</p>
              </div>
            </div>
            <dl className="divide-y divide-[var(--line)]">
              <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                <dt className="text-sm text-[var(--text-muted)]">Pagado</dt>
                <dd className="font-semibold">
                  {formatCurrency(report.summary.paidCentavos)}
                </dd>
              </div>
              <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                <dt className="text-sm text-[var(--text-muted)]">Pendiente</dt>
                <dd className="font-semibold">
                  {formatCurrency(report.summary.pendingCentavos)}
                </dd>
              </div>
              <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                <dt className="text-sm text-[var(--text-muted)]">
                  Movimientos
                </dt>
                <dd className="font-semibold">{report.payments.length}</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Paquetes y sesiones</h2>
                <p className="panel-description">Ventas y consumos del mes</p>
              </div>
            </div>
            <dl className="divide-y divide-[var(--line)]">
              <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                <dt className="text-sm text-[var(--text-muted)]">Vendidos</dt>
                <dd className="font-semibold">
                  {report.summary.packageSalesCount}
                </dd>
              </div>
              <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                <dt className="text-sm text-[var(--text-muted)]">
                  Sesiones vendidas
                </dt>
                <dd className="font-semibold">{report.summary.sessionsSold}</dd>
              </div>
              <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                <dt className="text-sm text-[var(--text-muted)]">
                  Sesiones consumidas
                </dt>
                <dd className="font-semibold">
                  {report.summary.sessionsConsumed}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-[var(--text-faint)]">
        La tasa de ausencias usa únicamente citas atendidas y citas donde el
        paciente no asistió. El Excel contiene nombres para conciliación, pero
        excluye teléfonos, correos y datos clínicos.
      </p>
    </div>
  );
}
