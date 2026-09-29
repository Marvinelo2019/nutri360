"use client";

import { useActionState, useMemo, useState } from "react";

import {
  calculateAdultAnthropometry,
  bmiLabels,
} from "@/lib/nutrition/anthropometry";

import { recordMeasurementAction } from "./actions";
import { initialMeasurementState } from "./schemas";

export function MeasurementForm({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(
    recordMeasurementAction,
    initialMeasurementState,
  );
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const preview = useMemo(() => {
    const values = [Number(weight), Number(height)];
    return values.every(Number.isFinite) && values[0] >= 20 && values[1] >= 50
      ? calculateAdultAnthropometry(values[0], values[1])
      : null;
  }, [weight, height]);

  return (
    <form action={action} className="panel p-5 sm:p-6" noValidate>
      <input type="hidden" name="patientId" value={patientId} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Nueva medición</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Cálculo adulto a partir de peso y talla.
          </p>
        </div>
        <span className="rounded-full bg-[var(--brand-50)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--brand-700)]">
          18+ años
        </span>
      </div>
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
            min="20"
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
            min="50"
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
      {state.message && (
        <div
          className={
            state.status === "success" ? "form-success mt-4" : "form-error mt-4"
          }
        >
          {state.message}
        </div>
      )}
      <button className="button-primary mt-5 w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar en historial"}
      </button>
    </form>
  );
}
