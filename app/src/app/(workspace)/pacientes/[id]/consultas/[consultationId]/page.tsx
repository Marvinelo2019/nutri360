import Link from "next/link";
import { notFound } from "next/navigation";

import { completeConsultationAction } from "@/features/consultations/actions";
import { getConsultation } from "@/features/consultations/data";
import { SoapForm } from "@/features/consultations/soap-form";

export const metadata = { title: "Consulta clínica" };

const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

const noteFields = [
  ["subjective", "S · Subjetivo"],
  ["objective", "O · Objetivo"],
  ["assessment", "A · Evaluación"],
  ["plan", "P · Plan"],
] as const;

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string; consultationId: string }>;
}) {
  const { id, consultationId } = await params;
  const record = await getConsultation(id, consultationId);
  if (!record) notFound();
  const { patient, consultation, previous } = record;
  const editable = consultation.status === "draft";
  const readyToComplete = Boolean(consultation.assessment && consultation.plan);
  return (
    <div className="mx-auto max-w-6xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href={`/pacientes/${id}`}
      >
        ← Volver al expediente
      </Link>
      <header className="mt-5 flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            {consultation.consultation_type === "initial"
              ? "Consulta inicial"
              : "Seguimiento"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {dateFormat.format(new Date(consultation.occurred_at))} ·{" "}
            {editable ? "En curso" : "Finalizada"}
          </p>
        </div>
        {editable && (
          <form
            action={completeConsultationAction.bind(null, consultation.id, id)}
          >
            <button className="button-secondary" disabled={!readyToComplete}>
              Finalizar consulta
            </button>
          </form>
        )}
      </header>
      {editable && !readyToComplete && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Guarda al menos la evaluación y el plan para poder finalizar.
        </p>
      )}
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <main>
          {editable ? (
            <SoapForm consultation={consultation} />
          ) : (
            <div className="space-y-4">
              {noteFields.map(([field, label]) => (
                <section className="panel p-5 sm:p-6" key={field}>
                  <h2 className="text-sm font-semibold">{label}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
                    {consultation[field] || "Sin información registrada."}
                  </p>
                </section>
              ))}
              {consultation.clinical_summary && (
                <section className="panel p-5 sm:p-6">
                  <h2 className="text-sm font-semibold">Resumen clínico</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
                    {consultation.clinical_summary}
                  </p>
                </section>
              )}
            </div>
          )}
        </main>
        <aside>
          <section className="panel p-5 xl:sticky xl:top-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Consulta anterior
            </p>
            {previous ? (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-[var(--text-muted)]">
                  {dateFormat.format(new Date(previous.occurred_at))}
                </p>
                <div>
                  <h3 className="text-xs font-semibold">Evaluación</h3>
                  <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-xs leading-5 text-[var(--text-muted)]">
                    {previous.assessment || "Sin registrar"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold">Plan</h3>
                  <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-xs leading-5 text-[var(--text-muted)]">
                    {previous.plan || "Sin registrar"}
                  </p>
                </div>
                <Link
                  className="inline-flex text-xs font-semibold text-[var(--brand-700)] hover:underline"
                  href={`/pacientes/${id}/consultas/${previous.id}`}
                >
                  Ver consulta completa
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                No hay una consulta finalizada anterior para comparar.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
