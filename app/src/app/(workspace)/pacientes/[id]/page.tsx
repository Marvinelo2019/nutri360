import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/icon";
import { getPatient } from "@/features/patients/data";
import { MeasurementForm } from "@/features/patients/measurement-form";
import {
  bmiLabels,
  type BmiClassification,
} from "@/lib/nutrition/anthropometry";

export const metadata = { title: "Expediente del paciente" };

const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeZone: "America/Guatemala",
});

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getPatient(id);
  if (!record) notFound();
  const latest = record.measurements[0];

  return (
    <div className="mx-auto max-w-[88rem]">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/pacientes"
      >
        ← Volver a pacientes
      </Link>
      <header className="mt-5 flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Expediente del paciente</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            {record.patient.first_name} {record.patient.last_name}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Nacimiento:{" "}
            {dateFormat.format(
              new Date(`${record.patient.birth_date}T12:00:00`),
            )}
          </p>
        </div>
        <span className="w-fit rounded-full bg-[var(--brand-50)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-700)]">
          Paciente activo
        </span>
      </header>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="panel p-5 sm:p-6">
            <h2 className="text-base font-semibold">Información general</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--text-faint)]">Teléfono</dt>
                <dd className="mt-1 text-sm font-medium">
                  {record.patient.phone_e164 || "No registrado"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-faint)]">Correo</dt>
                <dd className="mt-1 text-sm font-medium">
                  {record.patient.email || "No registrado"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-faint)]">
                  Sexo de referencia
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {record.patient.growth_reference_sex === "female"
                    ? "Femenino"
                    : record.patient.growth_reference_sex === "male"
                      ? "Masculino"
                      : "No especificado"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-faint)]">
                  Consentimiento
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {record.consent
                    ? `Registrado · ${record.consent.consent_version}`
                    : record.canViewClinical
                      ? "No vigente"
                      : "Registrado"}
                </dd>
              </div>
            </dl>
          </section>
          {record.canViewClinical ? (
            <>
              <section className="panel p-5 sm:p-6">
                <h2 className="text-base font-semibold">Contexto clínico</h2>
                <dl className="mt-5 space-y-5">
                  <div>
                    <dt className="text-xs text-[var(--text-faint)]">
                      Motivo de consulta
                    </dt>
                    <dd className="mt-1 text-sm leading-6">
                      {record.clinical?.consultation_reason || "Sin registrar"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--text-faint)]">
                      Objetivo principal
                    </dt>
                    <dd className="mt-1 text-sm leading-6">
                      {record.clinical?.goal || "Sin registrar"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Historial antropométrico</h2>
                    <p className="panel-description">
                      Cada medición queda conservada como registro clínico.
                    </p>
                  </div>
                  <Icon
                    name="scale"
                    className="size-5 text-[var(--brand-700)]"
                  />
                </div>
                {record.measurements.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[42rem] text-left text-sm">
                      <thead className="bg-[var(--surface-muted)] text-xs text-[var(--text-faint)]">
                        <tr>
                          <th className="px-6 py-3 font-medium">Fecha</th>
                          <th className="px-4 py-3 font-medium">Peso</th>
                          <th className="px-4 py-3 font-medium">Talla</th>
                          <th className="px-4 py-3 font-medium">IMC</th>
                          <th className="px-4 py-3 font-medium">
                            Clasificación
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line)]">
                        {record.measurements.map((m) => (
                          <tr key={m.id}>
                            <td className="px-6 py-4">
                              {dateFormat.format(new Date(m.measured_at))}
                            </td>
                            <td className="px-4 py-4">{m.weight_kg} kg</td>
                            <td className="px-4 py-4">{m.height_cm} cm</td>
                            <td className="px-4 py-4 font-semibold">{m.bmi}</td>
                            <td className="px-4 py-4">
                              {
                                bmiLabels[
                                  m.bmi_classification as BmiClassification
                                ]
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
                    Aún no hay mediciones guardadas.
                  </p>
                )}
              </section>
            </>
          ) : (
            <section className="panel p-6">
              <h2 className="font-semibold">Información clínica protegida</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Tu rol permite gestionar los datos administrativos, pero no
                consultar el expediente clínico.
              </p>
            </section>
          )}
        </div>
        {record.canViewClinical && (
          <aside className="space-y-5">
            <MeasurementForm patientId={id} />
            {latest && (
              <section className="panel p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                  Última medición
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {latest.bmi}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  IMC ·{" "}
                  {bmiLabels[latest.bmi_classification as BmiClassification]}
                </p>
                <div className="mt-4 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--text-muted)]">
                  Rango de peso por IMC: {latest.normal_weight_min_kg}–
                  {latest.normal_weight_max_kg} kg
                </div>
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
