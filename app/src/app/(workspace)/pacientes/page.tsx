import Link from "next/link";

import { Icon } from "@/components/icon";
import { listPatients } from "@/features/patients/data";

export const metadata = { title: "Pacientes" };

function ageFromDate(date: string) {
  const birth = new Date(`${date}T12:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()))
    age--;
  return age;
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [patients, params] = await Promise.all([listPatients(), searchParams]);
  const query = params.q?.trim().toLocaleLowerCase("es-GT") ?? "";
  const filtered = patients.filter((patient) =>
    `${patient.first_name} ${patient.last_name} ${patient.phone_e164 ?? ""} ${patient.email ?? ""}`
      .toLocaleLowerCase("es-GT")
      .includes(query),
  );

  return (
    <div className="mx-auto max-w-[88rem]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Directorio clínico</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Pacientes
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Registro central de las personas atendidas en el consultorio.
          </p>
        </div>
        <Link className="button-primary" href="/pacientes/nuevo">
          <Icon name="plus" className="size-4" />
          Nuevo paciente
        </Link>
      </div>
      <section className="panel mt-7">
        <div className="panel-header">
          <form className="relative w-full max-w-md">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-[var(--text-faint)]"
            />
            <input
              className="field-input pl-10"
              name="q"
              defaultValue={params.q}
              placeholder="Buscar por nombre, teléfono o correo"
              aria-label="Buscar pacientes"
            />
          </form>
          <span className="hidden text-xs text-[var(--text-faint)] sm:block">
            {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
          </span>
        </div>
        {filtered.length ? (
          <div className="divide-y divide-[var(--line)]">
            {filtered.map((patient) => (
              <Link
                key={patient.id}
                href={`/pacientes/${patient.id}`}
                className="grid gap-2 px-5 py-4 transition hover:bg-[var(--surface-muted)] sm:grid-cols-[1fr_9rem_12rem_1.5rem] sm:items-center sm:px-6"
              >
                <div>
                  <p className="font-semibold">
                    {patient.first_name} {patient.last_name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">
                    {patient.email ||
                      patient.phone_e164 ||
                      "Sin contacto registrado"}
                  </p>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {ageFromDate(patient.birth_date)} años
                </p>
                <span className="w-fit rounded-full bg-[var(--brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--brand-700)]">
                  Activo
                </span>
                <Icon
                  name="chevron"
                  className="hidden size-4 text-[var(--text-faint)] sm:block"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] text-[var(--brand-700)]">
                <Icon name="patients" className="size-5" />
              </span>
              <h2 className="mt-4 font-semibold">
                {query
                  ? "No encontramos coincidencias"
                  : "Aún no hay pacientes"}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {query
                  ? "Prueba con otro nombre o dato de contacto."
                  : "Registra al primer paciente para iniciar su expediente."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
