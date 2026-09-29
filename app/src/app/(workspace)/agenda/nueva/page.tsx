import Link from "next/link";

import { AppointmentForm } from "@/features/appointments/appointment-form";
import { getSchedulingOptions } from "@/features/appointments/data";
import { clinicDateKey } from "@/lib/format";

export const metadata = { title: "Nueva cita" };

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const [options, query] = await Promise.all([
    getSchedulingOptions(),
    searchParams,
  ]);
  const defaultDate =
    query.fecha && /^\d{4}-\d{2}-\d{2}$/.test(query.fecha)
      ? query.fecha
      : clinicDateKey();
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href={`/agenda?fecha=${defaultDate}`}
      >
        ← Volver a la agenda
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Agenda clínica</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Programar cita
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Selecciona paciente, profesional y horario. El sistema evitará cruces
          automáticamente.
        </p>
      </div>
      {options.patients.length ? (
        <AppointmentForm
          patients={options.patients}
          professionals={options.professionals}
          defaultDate={defaultDate}
        />
      ) : (
        <section className="panel p-6 text-center">
          <h2 className="font-semibold">Primero registra un paciente</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Necesitas un expediente activo para programar una consulta.
          </p>
          <Link className="button-primary mt-5" href="/pacientes/nuevo">
            Registrar paciente
          </Link>
        </section>
      )}
    </div>
  );
}
