"use client";

import { useActionState, useMemo, useState } from "react";

import {
  calculateAdultAnthropometry,
  bmiLabels,
} from "@/lib/nutrition/anthropometry";

import { recordMeasurementAction } from "./actions";
import { isUnder18 } from "./paediatric-growth";
import { initialMeasurementState } from "./schemas";

export function MeasurementForm({
  patientId,
  birthDate,
  growthReferenceSex,
}: {
  patientId: string;
  birthDate: string;
  growthReferenceSex: "female" | "male" | null;
}) {
  const [state, action, pending] = useActionState(
    recordMeasurementAction,
    initialMeasurementState,
  );
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const isPaediatric = isUnder18(birthDate);
  const preview = useMemo(() => {
    const values = [Number(weight), Number(height)];
    return !isPaediatric &&
      values.every(Number.isFinite) &&
      values[0] >= 20 &&
      values[1] >= 50
      ? calculateAdultAnthropometry(values[0], values[1])
      : null;
  }, [height, isPaediatric, weight]);

  return (
    <form action={action} className="panel p-5 sm:p-6" noValidate>
      <input type="hidden" name="patientId" value={patientId} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Nueva medición</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {isPaediatric
              ? "Indicadores de crecimiento por edad con referencia OMS."
              : "Cálculo adulto a partir de peso y talla."}
          </p>
        </div>
        <span className="rounded-full bg-[var(--brand-50)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--brand-700)]">
          {isPaediatric ? "Menor de 18 · OMS" : "18+ años"}
        </span>
      </div>
      {isPaediatric && !growthReferenceSex && (
        <div className="form-error mt-4">
          Define el sexo de referencia en el perfil antes de registrar una
          medición pediátrica.
        </div>
      )}
      {!isPaediatric && (
        <details className="mt-5 border-t border-[var(--line)] pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--brand-700)]">
            Agregar circunferencias y pliegues
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["waistCm", "Cintura (cm)"],
              ["hipCm", "Cadera (cm)"],
              ["armCm", "Brazo (cm)"],
              ["thighCm", "Muslo (cm)"],
              ["calfCm", "Pantorrilla (cm)"],
              ["tricepsMm", "Pliegue tríceps (mm)"],
              ["subscapularMm", "Pliegue subescapular (mm)"],
              ["suprailiacMm", "Pliegue suprailiaco (mm)"],
              ["abdominalMm", "Pliegue abdominal (mm)"],
            ].map(([name, label]) => (
              <div key={name}>
                <label className="field-label" htmlFor={name}>
                  {label}
                </label>
                <input
                  className="field-input"
                  id={name}
                  name={name}
                  min="0"
                  step="0.1"
                  type="number"
                />
                {state.errors?.[name]?.[0] && (
                  <p className="mt-1 text-xs text-[var(--danger)]">
                    {state.errors[name][0]}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            La relación cintura-cadera se calcula cuando ambas medidas están
            presentes. Los pliegues se conservan como mediciones directas.
          </p>
        </details>
      )}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="weightKg">
            Peso (kg)
          </label>
          <input
            className="field-input"
            id="weightKg"
            name="weightKg"
            type="number"
            min={isPaediatric ? "0.5" : "20"}
            max="300"
            step="0.01"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <p className="mt-1 text-xs text-[var(--danger)]">
            {state.errors?.weightKg?.[0]}
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="heightCm">
            Talla (cm)
          </label>
          <input
            className="field-input"
            id="heightCm"
            name="heightCm"
            type="number"
            min={isPaediatric ? "20" : "50"}
            max="250"
            step="0.01"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
          <p className="mt-1 text-xs text-[var(--danger)]">
            {state.errors?.heightCm?.[0]}
          </p>
        </div>
      </div>
      {preview && (
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <div>
            <p className="text-xs text-[var(--text-faint)]">IMC estimado</p>
            <p className="mt-1 text-xl font-semibold">{preview.bmi}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">Clasificación</p>
            <p className="mt-1 text-sm font-semibold">
              {bmiLabels[preview.classification]}
            </p>
          </div>
          <div className="col-span-2 text-xs text-[var(--text-muted)]">
            Rango de peso por IMC: {preview.normalWeightMinKg}–
            {preview.normalWeightMaxKg} kg · {preview.weightLb} lb
          </div>
        </div>
      )}
      {isPaediatric && (
        <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
          Se calcularán IMC, talla y, cuando corresponda por edad, peso para la
          edad. Estos indicadores apoyan el tamizaje clínico y no constituyen un
          diagnóstico.
        </p>
      )}
      {state.message && (
        <div
          className={
            state.status === "success" ? "form-success mt-4" : "form-error mt-4"
          }
        >
          {state.message}
        </div>
      )}
      <button
        className="button-primary mt-5 w-full"
        disabled={pending || (isPaediatric && !growthReferenceSex)}
      >
        {pending ? "Guardando…" : "Guardar en historial"}
      </button>
    </form>
  );
}
