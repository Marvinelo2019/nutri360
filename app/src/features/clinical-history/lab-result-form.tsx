"use client";

import { useActionState, useState } from "react";

import { recordLabResultAction } from "./actions";
import { initialClinicalHistoryState } from "./schemas";

export function LabResultForm({
  patientId,
  defaultDate,
}: {
  patientId: string;
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(
    recordLabResultAction,
    initialClinicalHistoryState,
  );
  const [values, setValues] = useState({
    testName: "",
    resultValue: "",
    unit: "",
    referenceMin: "",
    referenceMax: "",
    collectedOn: defaultDate,
    notes: "",
  });
  const update = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  return (
    <form action={action} className="panel p-5 sm:p-6" noValidate>
      <input name="patientId" type="hidden" value={patientId} />
      <h2 className="text-base font-semibold">
        Agregar resultado de laboratorio
      </h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Registra el valor tal como aparece en el informe. El sistema no realiza
        interpretación diagnóstica.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["testName", "Examen", "Ej. Glucosa"],
          ["resultValue", "Resultado", "Ej. 95"],
          ["unit", "Unidad", "Ej. mg/dL"],
          ["referenceMin", "Referencia mínima", "Ej. 70"],
          ["referenceMax", "Referencia máxima", "Ej. 100"],
        ].map(([name, label, placeholder]) => (
          <div key={name}>
            <label className="field-label" htmlFor={name}>
              {label}
            </label>
            <input
              className="field-input"
              id={name}
              name={name}
              onChange={(e) => update(name, e.target.value)}
              placeholder={placeholder}
              step={
                name.includes("Value") || name.includes("reference")
                  ? "any"
                  : undefined
              }
              type={name === "testName" || name === "unit" ? "text" : "number"}
              value={values[name as keyof typeof values]}
            />
            {state.errors?.[name]?.[0] && (
              <p className="mt-1 text-xs text-[var(--danger)]">
                {state.errors[name][0]}
              </p>
            )}
          </div>
        ))}
        <div>
          <label className="field-label" htmlFor="collectedOn">
            Fecha de toma
          </label>
          <input
            className="field-input"
            id="collectedOn"
            name="collectedOn"
            onChange={(e) => update("collectedOn", e.target.value)}
            type="date"
            value={values.collectedOn}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="field-label" htmlFor="notes">
            Notas
          </label>
          <textarea
            className="field-input min-h-20 py-3"
            id="notes"
            name="notes"
            onChange={(e) => update("notes", e.target.value)}
            value={values.notes}
          />
        </div>
      </div>
      {state.message && (
        <div
          className={`mt-4 ${state.status === "success" ? "form-success" : "form-error"}`}
        >
          {state.message}
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <button className="button-secondary" disabled={pending}>
          {pending ? "Registrando…" : "Agregar resultado"}
        </button>
      </div>
    </form>
  );
}
