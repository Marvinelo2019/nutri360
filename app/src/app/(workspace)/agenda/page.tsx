import Link from "next/link";

import { Icon } from "@/components/icon";
import { changeAppointmentStatusAction } from "@/features/appointments/actions";
import { getDailyAgenda } from "@/features/appointments/data";
import {
  appointmentModalityLabels,
  appointmentStatusLabels,
} from "@/features/appointments/presentation";
import {
  clinicDateKey,
  formatClinicDate,
  formatClinicTime,
  shiftDateKey,
} from "@/lib/format";
import { requireWorkspace } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export const metadata = { title: "Agenda" };

function isDateKey(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function statusClass(
  status: Database["public"]["Enums"]["appointment_status"],
) {
  if (status === "completed")
    return "bg-[var(--success-bg)] text-[var(--success)]";
  if (["cancelled", "no_show", "rescheduled"].includes(status))
    return "bg-[#f5f2f0] text-[var(--text-muted)]";
  return "bg-[var(--brand-50)] text-[var(--brand-700)]";
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const query = await searchParams;
  const date = isDateKey(query.fecha) ? query.fecha : clinicDateKey();
  const [{ workspace }, appointments] = await Promise.all([
    requireWorkspace(),
    getDailyAgenda(date),
  ]);
  const displayDate = new Date(`${date}T12:00:00Z`);

  return (
    <div className="mx-auto max-w-[88rem]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Operación diaria</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Agenda
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Organiza las consultas del equipo sin cruces de horario.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="button-secondary min-h-12"
            href="/agenda/recordatorios"
          >
            Recordatorios
          </Link>
          {workspace.role !== "assistant" && (
            <Link
              className="button-secondary min-h-12"
              href="/agenda/configuracion"
            >
              Reservas públicas
            </Link>
          )}
          <Link className="button-primary" href={`/agenda/nueva?fecha=${date}`}>
            <Icon name="plus" className="size-4" />
            Nueva cita
          </Link>
        </div>
      </div>
      <section className="panel mt-7">
        <div className="panel-header">
          <Link
            className="icon-button"
            aria-label="Día anterior"
            href={`/agenda?fecha=${shiftDateKey(date, -1)}`}
          >
            ←
          </Link>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {formatClinicDate(displayDate)}
            </p>
            {date === clinicDateKey() && (
              <p className="mt-1 text-xs text-[var(--brand-600)]">Hoy</p>
            )}
          </div>
          <Link
            className="icon-button"
            aria-label="Día siguiente"
            href={`/agenda?fecha=${shiftDateKey(date, 1)}`}
          >
            →
          </Link>
        </div>
        {appointments.length ? (
          <div className="divide-y divide-[var(--line)]">
            {appointments.map((appointment) => {
              const final = [
                "completed",
                "no_show",
                "cancelled",
                "rescheduled",
              ].includes(appointment.status);
              return (
                <article
                  key={appointment.id}
                  className="grid gap-4 px-5 py-5 sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:px-6"
                >
                  <div>
                    <p className="text-lg font-semibold text-[var(--brand-700)]">
                      {formatClinicTime(new Date(appointment.starts_at))}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">
                      a {formatClinicTime(new Date(appointment.ends_at))}
                    </p>
                  </div>
                  <div>
                    <Link
                      className="font-semibold hover:text-[var(--brand-700)]"
                      href={`/pacientes/${appointment.patient_id}`}
                    >
                      {appointment.patient
                        ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                        : "Paciente"}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {appointmentModalityLabels[appointment.modality]} ·{" "}
                      {appointment.professional?.full_name ?? "Profesional"}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${statusClass(appointment.status)}`}
                    >
                      {appointmentStatusLabels[appointment.status]}
                    </span>
                  </div>
                  {!final && (
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {appointment.status === "pending" && (
                        <form
                          action={changeAppointmentStatusAction.bind(
                            null,
                            appointment.id,
                            "confirmed",
                          )}
                        >
                          <button className="button-secondary">
                            Confirmar
                          </button>
                        </form>
                      )}
                      <form
                        action={changeAppointmentStatusAction.bind(
                          null,
                          appointment.id,
                          "completed",
                        )}
                      >
                        <button className="button-secondary">Atendida</button>
                      </form>
                      <form
                        action={changeAppointmentStatusAction.bind(
                          null,
                          appointment.id,
                          "no_show",
                        )}
                      >
                        <button className="button-secondary">No asistió</button>
                      </form>
                      <form
                        action={changeAppointmentStatusAction.bind(
                          null,
                          appointment.id,
                          "cancelled",
                        )}
                      >
                        <button className="button-secondary text-[var(--danger)]">
                          Cancelar
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-80 place-items-center px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] text-[var(--brand-700)]">
                <Icon name="calendar" className="size-5" />
              </span>
              <h2 className="mt-4 font-semibold">No hay citas programadas</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Este día está disponible. Puedes programar una consulta desde
                aquí.
              </p>
              <Link
                className="button-secondary mt-5"
                href={`/agenda/nueva?fecha=${date}`}
              >
                Programar cita
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
