"use client";

import { useActionState, useState } from "react";

import { createEnergyCalculationAction } from "./actions";
import { initialEnergyCalculationState } from "./schemas";

type MeasurementOption = {
  id: string;
  measured_at: string;
  weight_kg: number;
  height_cm: number;
};

const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeZone: "America/Guatemala",
});

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function EnergyCalculationForm({
  patientId,
  measurements,
}: {
  patientId: string;
  measurements: MeasurementOption[];
}) {
  const [state, action, pending] = useActionState(
    createEnergyCalculationAction,
    initialEnergyCalculationState,
  );
  const [macroMethod, setMacroMethod] = useState(
    state.values?.macroMethod ?? "percentage",
  );
  const percentage = macroMethod === "percentage";

  return (
    <form
      key={state.attempt ?? 0}
      action={action}
      className="space-y-5"
      noValidate
    >
      <input name="patientId" type="hidden" value={patientId} />
      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Base del cálculo</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          El resultado es una estimación clínica. Se conservarán la medición,
          fórmula y parámetros utilizados.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="measurementId">
              Medición antropométrica
            </label>
            <select
              className="field-input"
              id="measurementId"
              name="measurementId"
              defaultValue={state.values?.measurementId ?? measurements[0]?.id}
              aria-invalid={Boolean(state.errors?.measurementId)}
            >
              {measurements.map((measurement) => (
                <option key={measurement.id} value={measurement.id}>
                  {dateFormat.format(new Date(measurement.measured_at))} ·{" "}
                  {measurement.weight_kg} kg · {measurement.height_cm} cm
                </option>
              ))}
            </select>
            <ErrorText errors={state.errors?.measurementId} />
          </div>
          <div>
            <label className="field-label" htmlFor="formula">
              Fórmula
            </label>
            <select
              className="field-input"
              id="formula"
              name="formula"
              defaultValue={state.values?.formula ?? "mifflin_st_jeor"}
              aria-invalid={Boolean(state.errors?.formula)}
            >
              <option value="mifflin_st_jeor">Mifflin–St Jeor (1990)</option>
              <option value="harris_benedict_revised">
                Harris–Benedict revisada (1984)
              </option>
              <option value="fao_who_unu">FAO/WHO/UNU (1985)</option>
            </select>
            <ErrorText errors={state.errors?.formula} />
          </div>
          <div>
            <label className="field-label" htmlFor="activityFactor">
              Factor de actividad
            </label>
            <select
              className="field-input"
              id="activityFactor"
              name="activityFactor"
              defaultValue={state.values?.activityFactor ?? "1.2"}
              aria-invalid={Boolean(state.errors?.activityFactor)}
            >
              <option value="1.2">1.20 · Sedentaria</option>
              <option value="1.375">1.375 · Ligera</option>
              <option value="1.55">1.55 · Moderada</option>
              <option value="1.725">1.725 · Alta</option>
              <option value="1.9">1.90 · Muy alta</option>
            </select>
            <ErrorText errors={state.errors?.activityFactor} />
          </div>
          <div>
            <label className="field-label" htmlFor="goalAdjustmentKcal">
              Ajuste profesional (kcal/día)
            </label>
            <input
              className="field-input"
              id="goalAdjustmentKcal"
              name="goalAdjustmentKcal"
              type="number"
              min="-1500"
              max="1500"
              step="50"
              defaultValue={state.values?.goalAdjustmentKcal ?? "0"}
              aria-invalid={Boolean(state.errors?.goalAdjustmentKcal)}
            />
            <p className="mt-1.5 text-xs text-[var(--text-faint)]">
              Negativo para déficit, positivo para superávit; Nutri360 no
              prescribe el ajuste.
            </p>
            <ErrorText errors={state.errors?.goalAdjustmentKcal} />
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">
          Distribución de macronutrientes
        </h2>
        <div className="mt-5">
          <label className="field-label" htmlFor="macroMethod">
            Método
          </label>
          <select
            className="field-input max-w-md"
            id="macroMethod"
            name="macroMethod"
            value={macroMethod}
            onChange={(event) => setMacroMethod(event.target.value)}
            aria-invalid={Boolean(state.errors?.macroMethod)}
          >
            <option value="percentage">Porcentaje de energía</option>
            <option value="grams_per_kg">Gramos por kilogramo</option>
          </select>
          <ErrorText errors={state.errors?.macroMethod} />
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            [
              "proteinInput",
              "Proteína",
              percentage ? "20" : "1.2",
              percentage ? 100 : 10,
            ],
            [
              "carbohydrateInput",
              "Carbohidratos",
              percentage ? "50" : "3",
              percentage ? 100 : 15,
            ],
            [
              "fatInput",
              "Grasas",
              percentage ? "30" : "0.8",
              percentage ? 100 : 5,
            ],
          ].map(([name, label, fallback, maximum]) => (
            <div key={String(name)}>
              <label className="field-label" htmlFor={String(name)}>
                {label} ({percentage ? "%" : "g/kg"})
              </label>
              <input
                className="field-input"
                id={String(name)}
                key={`${macroMethod}-${String(name)}`}
                name={String(name)}
                type="number"
                min="0"
                max={String(maximum)}
                step="0.1"
                defaultValue={
                  state.values?.macroMethod === macroMethod
                    ? (state.values?.[
                        name as keyof typeof state.values
                      ] as string)
                    : String(fallback)
                }
                aria-invalid={Boolean(state.errors?.[String(name)])}
              />
              <ErrorText errors={state.errors?.[String(name)]} />
            </div>
          ))}
        </div>
        {percentage && (
          <p className="mt-4 text-xs text-[var(--text-faint)]">
            Los tres porcentajes deben sumar exactamente 100%.
          </p>
        )}
      </section>

      {state.message && <div className="form-error">{state.message}</div>}
      <div className="flex justify-end">
        <button
          className="button-primary w-full sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Calculando…" : "Calcular y guardar resultado"}
        </button>
      </div>
    </form>
  );
}
