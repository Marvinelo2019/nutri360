"use client";

import { useActionState } from "react";

import { submitPublicIntakeAction } from "./actions";
import { initialIntakeFormState } from "./schemas";

const textFields = [
  [
    "medicalHistory",
    "Antecedentes médicos",
    "Enfermedades, cirugías u otros eventos relevantes.",
  ],
  [
    "familyHistory",
    "Antecedentes familiares",
    "Diabetes, hipertensión u otras condiciones familiares.",
  ],
  [
    "allergies",
    "Alergias",
    "Alimentos, medicamentos u otras alergias conocidas.",
  ],
  [
    "medications",
    "Medicamentos y suplementos",
    "Nombre, dosis y frecuencia si los conoces.",
  ],
  [
    "recall24h",
    "Lo que comiste y bebiste ayer",
    "Incluye horarios, cantidades aproximadas y bebidas.",
  ],
  [
    "eatingHabits",
    "Hábitos de alimentación",
    "Horarios, comidas fuera de casa y preparación habitual.",
  ],
  [
    "physicalActivity",
    "Actividad física",
    "Tipo, frecuencia, duración e intensidad.",
  ],
  [
    "preferences",
    "Preferencias",
    "Alimentos preferidos y costumbres alimentarias.",
  ],
  [
    "restrictions",
    "Restricciones",
    "Intolerancias o restricciones religiosas, económicas o personales.",
  ],
] as const;

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function PublicIntakeForm({
  clinicName,
  consentVersion,
  token,
}: {
  clinicName: string;
  consentVersion: string;
  token: string;
}) {
  const [state, action, pending] = useActionState(
    submitPublicIntakeAction.bind(null, token),
    initialIntakeFormState,
  );

  if (state.status === "success") {
    return (
      <section className="panel p-6 text-center sm:p-8" role="status">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--success-bg)] text-xl text-[var(--success)]">
          ✓
        </span>
        <h2 className="mt-4 text-xl font-semibold">Preconsulta enviada</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">
          {state.message}
        </p>
      </section>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input name="consentVersion" type="hidden" value={consentVersion} />
      <section className="panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Salud y alimentación</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Completa lo que conozcas. Puedes dejar en blanco cualquier pregunta
          que necesites conversar con el profesional.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {textFields.map(([name, label, help]) => (
            <div key={name}>
              <label className="field-label" htmlFor={name}>
                {label}
              </label>
              <p className="mb-2 text-xs text-[var(--text-muted)]">{help}</p>
              <textarea
                className="field-input min-h-24 py-3"
                defaultValue={state.values?.[name]}
                id={name}
                name={name}
              />
              <ErrorText errors={state.errors?.[name]} />
            </div>
          ))}
          <div>
            <label className="field-label" htmlFor="waterLiters">
              Agua al día (litros)
            </label>
            <input
              className="field-input"
              defaultValue={state.values?.waterLiters}
              id="waterLiters"
              max="20"
              min="0"
              name="waterLiters"
              step="0.1"
              type="number"
            />
            <ErrorText errors={state.errors?.waterLiters} />
          </div>
          <div>
            <label className="field-label" htmlFor="sleepHours">
              Sueño al día (horas)
            </label>
            <input
              className="field-input"
              defaultValue={state.values?.sleepHours}
              id="sleepHours"
              max="24"
              min="0"
              name="sleepHours"
              step="0.1"
              type="number"
            />
            <ErrorText errors={state.errors?.sleepHours} />
          </div>
        </div>
        <label className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm leading-6">
          <input
            className="mt-1 size-4 shrink-0 accent-[var(--brand-700)]"
            name="consent"
            type="checkbox"
          />
          <span>
            Autorizo a {clinicName} a recibir y revisar esta información de
            salud para preparar mi atención nutricional. Aviso {consentVersion}.
          </span>
        </label>
        <ErrorText errors={state.errors?.consent} />
        {state.message && (
          <div className="form-error mt-5" role="alert">
            {state.message}
          </div>
        )}
        <button className="button-primary mt-6 w-full" disabled={pending}>
          {pending ? "Enviando…" : "Enviar preconsulta"}
        </button>
      </section>
    </form>
  );
}
