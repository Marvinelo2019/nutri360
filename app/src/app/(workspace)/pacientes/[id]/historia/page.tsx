import Link from "next/link";
import { notFound } from "next/navigation";

import { getClinicalHistory } from "@/features/clinical-history/data";
import { HistoryForm } from "@/features/clinical-history/history-form";
import { LabResultForm } from "@/features/clinical-history/lab-result-form";
import { clinicDateKey } from "@/lib/format";

export const metadata = { title: "Historia clínica" };
const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeZone: "America/Guatemala",
});

export default async function ClinicalHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getClinicalHistory(id);
  if (!record) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href={`/pacientes/${id}`}
      >
        ← Volver al expediente
      </Link>
      <header className="mt-5 border-b border-[var(--line)] pb-6">
        <p className="eyebrow">Expediente clínico</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Historia de {record.patient.first_name} {record.patient.last_name}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Antecedentes, alimentación, hábitos y resultados de laboratorio.
        </p>
      </header>
      <div className="mt-6">
        <HistoryForm
          dietary={record.dietary}
          health={record.health}
          patientId={id}
        />
      </div>
      <section className="mt-8">
        <LabResultForm defaultDate={clinicDateKey()} patientId={id} />
        <div className="panel mt-5 overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Resultados registrados</h2>
              <p className="panel-description">
                Historial ordenado por fecha de toma.
              </p>
            </div>
          </div>
          {record.labs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="bg-[var(--surface-muted)] text-xs text-[var(--text-faint)]">
                  <tr>
                    <th className="px-6 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Examen</th>
                    <th className="px-4 py-3 font-medium">Resultado</th>
                    <th className="px-4 py-3 font-medium">Referencia</th>
                    <th className="px-4 py-3 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {record.labs.map((lab) => (
                    <tr key={lab.id}>
                      <td className="px-6 py-4">
                        {dateFormat.format(
                          new Date(`${lab.collected_on}T12:00:00Z`),
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium">{lab.test_name}</td>
                      <td className="px-4 py-4">
                        {lab.result_value} {lab.unit}
                      </td>
                      <td className="px-4 py-4">
                        {lab.reference_min ?? "—"} – {lab.reference_max ?? "—"}{" "}
                        {lab.unit}
                      </td>
                      <td className="max-w-xs px-4 py-4 text-[var(--text-muted)]">
                        {lab.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
              Aún no hay resultados de laboratorio.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
