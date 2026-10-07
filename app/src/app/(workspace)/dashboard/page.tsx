import Link from "next/link";

import { Icon, type IconName } from "@/components/icon";
import { getDailyAgenda } from "@/features/appointments/data";
import { appointmentModalityLabels } from "@/features/appointments/presentation";
import { getActiveMealPlanCount } from "@/features/meal-plans/data";
import { getPackageBalanceSummary } from "@/features/packages/data";
import { getPatientCount } from "@/features/patients/data";
import { getMonthlyReportSummary } from "@/features/reports/data";
import { requireWorkspace } from "@/lib/auth/session";
import {
  clinicDateKey,
  formatClinicDate,
  formatClinicTime,
  formatCurrency,
} from "@/lib/format";

export const metadata = { title: "Inicio" };

const percentFormat = new Intl.NumberFormat("es-GT", {
  style: "percent",
  maximumFractionDigits: 1,
});

export default async function DashboardPage() {
  const { fullName, workspace } = await requireWorkspace();
  const currentMonth = clinicDateKey().slice(0, 7);
  const [
    patientCount,
    todayAppointments,
    activePlanCount,
    monthlySummary,
    packageSummary,
  ] = await Promise.all([
    getPatientCount(),
    getDailyAgenda(),
    getActiveMealPlanCount(),
    getMonthlyReportSummary(currentMonth),
    getPackageBalanceSummary(),
  ]);
  const activeTodayAppointments = todayAppointments.filter(
    (appointment) => !["cancelled", "rescheduled"].includes(appointment.status),
  );
  const firstName = fullName.split(/\s+/)[0];
  const metrics: Array<{
    label: string;
    value: string;
    note: string;
    icon: IconName;
  }> = [
    {
      label: "Citas de hoy",
      value: String(activeTodayAppointments.length),
      note: activeTodayAppointments.length
        ? "Consultas programadas"
        : "Sin citas programadas",
      icon: "calendar",
    },
    {
      label: "Pacientes activos",
      value: String(patientCount),
      note: patientCount ? "Expedientes vigentes" : "Aún sin registros",
      icon: "patients",
    },
    {
      label: "Planes activos",
      value: String(activePlanCount),
      note:
        workspace.role === "assistant"
          ? "Acceso clínico restringido"
          : activePlanCount
            ? "Planes vigentes"
            : "Aún sin planes",
      icon: "clipboard",
    },
    {
      label: "Ausencias del mes",
      value: String(monthlySummary.noShowCount),
      note:
        monthlySummary.noShowRate === null
          ? "Sin citas resueltas"
          : `${percentFormat.format(monthlySummary.noShowRate)} de citas resueltas`,
      icon: "calendar",
    },
    {
      label: "Ingresos del mes",
      value: formatCurrency(monthlySummary.paidCentavos),
      note: "Pagos efectivos",
      icon: "payments",
    },
    {
      label: "Saldo pendiente",
      value: formatCurrency(monthlySummary.pendingCentavos),
      note: "Movimientos pendientes",
      icon: "payments",
    },
    {
      label: "Paquetes activos",
      value: String(packageSummary.activePackageCount),
      note: packageSummary.activePackageCount
        ? "Con saldo disponible"
        : "Sin paquetes activos",
      icon: "payments",
    },
    {
      label: "Sesiones disponibles",
      value: String(packageSummary.availableSessions),
      note: "Saldo en paquetes activos",
      icon: "dashboard",
    },
  ];

  return (
    <div className="mx-auto max-w-[88rem]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Resumen del consultorio</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Buen día, {firstName}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Este es el estado actual de tu práctica.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="button-secondary min-h-12" href="/reportes">
            Ver reporte mensual
          </Link>
          <Link className="button-primary sm:w-auto" href="/pacientes/nuevo">
            <Icon name="plus" className="size-4" />
            Nuevo paciente
          </Link>
        </div>
      </div>

      <section
        className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores"
      >
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {metric.label}
              </p>
              <Icon
                name={metric.icon}
                className="size-[1.1rem] text-[var(--brand-600)]"
              />
            </div>
            <p className="mt-5 text-[1.85rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">
              {metric.value}
            </p>
            <p className="mt-1.5 text-xs text-[var(--text-faint)]">
              {metric.note}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <article className="panel min-h-[25rem]">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Agenda de hoy</h2>
              <p className="panel-description">
                {formatClinicDate(new Date())}
              </p>
            </div>
            <Link className="button-secondary" href="/agenda">
              Ver agenda
            </Link>
          </div>
          {activeTodayAppointments.length ? (
            <div className="divide-y divide-[var(--line)]">
              {activeTodayAppointments.slice(0, 5).map((appointment) => (
                <div
                  className="flex items-center gap-4 px-5 py-4 sm:px-6"
                  key={appointment.id}
                >
                  <p className="w-16 shrink-0 text-sm font-semibold text-[var(--brand-700)]">
                    {formatClinicTime(new Date(appointment.starts_at))}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {appointment.patient
                        ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                        : "Paciente"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">
                      {appointmentModalityLabels[appointment.modality]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[19rem] place-items-center px-6 py-10 text-center">
              <div className="max-w-sm">
                <span className="mx-auto grid size-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] text-[var(--brand-700)]">
                  <Icon name="calendar" className="size-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold">
                  Tu agenda está libre
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Programa una consulta y aparecerá en este resumen.
                </p>
                <Link className="button-secondary mt-5" href="/agenda/nueva">
                  Programar cita
                </Link>
              </div>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Primeros pasos</h2>
              <p className="panel-description">Configuración del espacio</p>
            </div>
          </div>
          <ol className="divide-y divide-[var(--line)] px-5">
            {[
              ["Consultorio creado", "Completado", true],
              ["Identidad visual disponible", "Completado", true],
              [
                "Registrar primer paciente",
                patientCount ? "Completado" : "Pendiente",
                patientCount > 0,
              ],
            ].map(([label, status, complete], index) => (
              <li className="flex items-center gap-3 py-4" key={String(label)}>
                <span className={complete ? "step step-complete" : "step"}>
                  {complete ? "✓" : index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {label}
                </span>
                <span className="text-xs text-[var(--text-faint)]">
                  {status}
                </span>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}
