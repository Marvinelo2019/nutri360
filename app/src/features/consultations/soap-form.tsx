"use client";

import { useActionState } from "react";

import type { Tables } from "@/types/database";

import { updateConsultationAction } from "./actions";
import { initialConsultationState } from "./schemas";

const fields = [
  [
    "subjective",
    "S · Subjetivo",
    "Síntomas, percepción, adherencia, hábitos y relato del paciente.",
  ],
  [
    "objective",
    "O · Objetivo",
    "Hallazgos observables, mediciones y resultados relevantes.",
  ],
  ["assessment", "A · Evaluación", "Interpretación y valoración nutricional."],
  ["plan", "P · Plan", "Intervención, acuerdos, metas y próximos pasos."],
] as const;

export function SoapForm({
  consultation,
}: {
  consultation: Tables<"consultations">;
}) {
  const [state, action, pending] = useActionState(
    updateConsultationAction,
    initialConsultationState,
  );
  const value = (name: (typeof fields)[number][0]) =>
    state.values?.[name] ?? consultation[name] ?? "";
  return (
    <form
      key={state.attempt ?? 0}
      action={action}
      className="space-y-5"
      noValidate
    >
      <input name="consultationId" type="hidden" value={consultation.id} />
      <input name="patientId" type="hidden" value={consultation.patient_id} />
      {fields.map(([name, label, help]) => (
        <section className="panel p-5 sm:p-6" key={name}>
          <label className="text-sm font-semibold" htmlFor={name}>
            {label}
          </label>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{help}</p>
          <textarea
            aria-invalid={Boolean(state.errors?.[name])}
            className="field-input mt-4 min-h-32 py-3"
            defaultValue={value(name)}
            id={name}
            maxLength={8000}
            name={name}
          />
          {state.errors?.[name]?.[0] && (
            <p className="mt-2 text-xs text-[var(--danger)]">
              {state.errors[name][0]}
            </p>
          )}
        </section>
      ))}
      <section className="panel p-5 sm:p-6">
        <label className="text-sm font-semibold" htmlFor="clinicalSummary">
          Resumen clínico
        </label>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Síntesis breve para consultar rápidamente en futuros seguimientos.
        </p>
        <textarea
          className="field-input mt-4 min-h-24 py-3"
          defaultValue={
            state.values?.clinicalSummary ?? consultation.clinical_summary ?? ""
          }
          id="clinicalSummary"
          maxLength={4000}
          name="clinicalSummary"
        />
      </section>
      {state.message && (
        <div
          className={state.status === "success" ? "form-success" : "form-error"}
          role="status"
        >
          {state.message}
        </div>
      )}
      <div className="flex justify-end">
        <button className="button-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
