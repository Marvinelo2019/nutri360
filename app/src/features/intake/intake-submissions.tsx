import type { Tables } from "@/types/database";

const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

const fields = [
  ["medical_history", "Antecedentes médicos"],
  ["family_history", "Antecedentes familiares"],
  ["allergies", "Alergias"],
  ["medications", "Medicamentos y suplementos"],
  ["recall_24h", "Recordatorio de 24 horas"],
  ["eating_habits", "Hábitos de alimentación"],
  ["physical_activity", "Actividad física"],
  ["preferences", "Preferencias"],
  ["restrictions", "Restricciones"],
] as const;

export function IntakeSubmissions({
  submissions,
}: {
  submissions: Tables<"intake_submissions">[];
}) {
  return (
    <section className="panel mt-6 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Respuestas de preconsulta</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Información declarada por el paciente. Revísala antes de incorporarla a
        la historia clínica profesional.
      </p>
      {submissions.length ? (
        <div className="mt-5 space-y-5">
          {submissions.map((submission) => (
            <article
              className="rounded-xl border border-[var(--line)] p-4 sm:p-5"
              key={submission.id}
            >
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                Enviado {dateFormat.format(new Date(submission.submitted_at))} ·
                consentimiento {submission.consent_version}
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {fields.map(([key, label]) => (
                  <div key={key}>
                    <dt className="text-xs font-semibold text-[var(--text-faint)]">
                      {label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm leading-6">
                      {submission[key] || "—"}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs font-semibold text-[var(--text-faint)]">
                    Agua al día
                  </dt>
                  <dd className="mt-1 text-sm">
                    {submission.water_liters == null
                      ? "—"
                      : `${submission.water_liters} litros`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[var(--text-faint)]">
                    Sueño al día
                  </dt>
                  <dd className="mt-1 text-sm">
                    {submission.sleep_hours == null
                      ? "—"
                      : `${submission.sleep_hours} horas`}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-[var(--surface-muted)] px-4 py-5 text-sm text-[var(--text-muted)]">
          Aún no hay respuestas de preconsulta.
        </p>
      )}
    </section>
  );
}
