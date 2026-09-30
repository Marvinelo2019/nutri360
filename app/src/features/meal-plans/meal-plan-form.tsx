"use client";

import { useActionState } from "react";

import { createMealPlanAction } from "./actions";
import { initialMealPlanState, type MealPlanFormValues } from "./schemas";

type PatientOption = { id: string; first_name: string; last_name: string };

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function MealPlanForm({
  patients,
  initialValues,
}: {
  patients: PatientOption[];
  initialValues?: Partial<MealPlanFormValues>;
}) {
  const [state, action, pending] = useActionState(
    createMealPlanAction,
    initialMealPlanState,
  );
  return (
    <form
      key={state.attempt ?? 0}
      action={action}
      className="space-y-5"
      noValidate
    >
      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Información del plan</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="patientId">
              Paciente
            </label>
            <select
              className="field-input"
              id="patientId"
              name="patientId"
              defaultValue={
                state.values?.patientId ?? initialValues?.patientId ?? ""
              }
              aria-invalid={Boolean(state.errors?.patientId)}
            >
              <option value="" disabled>
                Seleccionar paciente
              </option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>
            <ErrorText errors={state.errors?.patientId} />
          </div>
          <div>
            <label className="field-label" htmlFor="name">
              Nombre del plan
            </label>
            <input
              className="field-input"
              id="name"
              name="name"
              placeholder="Ej. Plan inicial"
              defaultValue={state.values?.name ?? initialValues?.name ?? ""}
              aria-invalid={Boolean(state.errors?.name)}
            />
            <ErrorText errors={state.errors?.name} />
          </div>
          <div>
            <label className="field-label" htmlFor="startsOn">
              Fecha inicial
            </label>
            <input
              className="field-input"
              id="startsOn"
              name="startsOn"
              type="date"
              defaultValue={
                state.values?.startsOn ?? initialValues?.startsOn ?? ""
              }
              aria-invalid={Boolean(state.errors?.startsOn)}
            />
            <ErrorText errors={state.errors?.startsOn} />
          </div>
          <div>
            <label className="field-label" htmlFor="endsOn">
              Fecha final
            </label>
            <input
              className="field-input"
              id="endsOn"
              name="endsOn"
              type="date"
              defaultValue={state.values?.endsOn ?? initialValues?.endsOn ?? ""}
              aria-invalid={Boolean(state.errors?.endsOn)}
            />
            <ErrorText errors={state.errors?.endsOn} />
          </div>
        </div>
      </section>
      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Objetivos diarios</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Puedes ingresarlos manualmente o precargarlos desde un cálculo
          guardado en el expediente.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
          <div>
            <label className="field-label" htmlFor="energyKcal">
              Energía (kcal)
            </label>
            <input
              className="field-input"
              id="energyKcal"
              name="energyKcal"
              type="number"
              min="500"
              max="8000"
              defaultValue={
                state.values?.energyKcal ?? initialValues?.energyKcal ?? ""
              }
              aria-invalid={Boolean(state.errors?.energyKcal)}
            />
            <ErrorText errors={state.errors?.energyKcal} />
          </div>
          <div>
            <label className="field-label" htmlFor="proteinG">
              Proteína (g)
            </label>
            <input
              className="field-input"
              id="proteinG"
              name="proteinG"
              type="number"
              min="0"
              step="0.1"
              defaultValue={
                state.values?.proteinG ?? initialValues?.proteinG ?? ""
              }
              aria-invalid={Boolean(state.errors?.proteinG)}
            />
            <ErrorText errors={state.errors?.proteinG} />
          </div>
          <div>
            <label className="field-label" htmlFor="carbohydrateG">
              Carbohidratos (g)
            </label>
            <input
              className="field-input"
              id="carbohydrateG"
              name="carbohydrateG"
              type="number"
              min="0"
              step="0.1"
              defaultValue={
                state.values?.carbohydrateG ??
                initialValues?.carbohydrateG ??
                ""
              }
              aria-invalid={Boolean(state.errors?.carbohydrateG)}
            />
            <ErrorText errors={state.errors?.carbohydrateG} />
          </div>
          <div>
            <label className="field-label" htmlFor="fatG">
              Grasas (g)
            </label>
            <input
              className="field-input"
              id="fatG"
              name="fatG"
              type="number"
              min="0"
              step="0.1"
              defaultValue={state.values?.fatG ?? initialValues?.fatG ?? ""}
              aria-invalid={Boolean(state.errors?.fatG)}
            />
            <ErrorText errors={state.errors?.fatG} />
          </div>
        </div>
        <div className="mt-5">
          <label className="field-label" htmlFor="instructions">
            Indicaciones generales
          </label>
          <textarea
            className="field-input min-h-28 py-3"
            id="instructions"
            name="instructions"
            maxLength={4000}
            placeholder="Hidratación, preparación, sustituciones u otras indicaciones…"
            defaultValue={
              state.values?.instructions ?? initialValues?.instructions ?? ""
            }
            aria-invalid={Boolean(state.errors?.instructions)}
          />
          <ErrorText errors={state.errors?.instructions} />
        </div>
      </section>
      {state.message && <div className="form-error">{state.message}</div>}
      <div className="flex justify-end">
        <button
          className="button-primary w-full sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creando…" : "Crear plan y agregar alimentos"}
        </button>
      </div>
    </form>
  );
}
