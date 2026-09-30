"use client";

import { useActionState, useState } from "react";

import type { Tables } from "@/types/database";

import { saveClinicalHistoryAction } from "./actions";
import { initialClinicalHistoryState } from "./schemas";

type Values = Record<string, string>;
const healthFields = [
  [
    "medicalHistory",
    "Antecedentes médicos",
    "Enfermedades, cirugías y eventos relevantes.",
  ],
  [
    "diagnoses",
    "Diagnósticos actuales",
    "Diagnósticos confirmados relevantes para la atención nutricional.",
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
    "Nombre, dosis y frecuencia cuando estén disponibles.",
  ],
] as const;
const dietaryFields = [
  [
    "recall24h",
    "Recordatorio de 24 horas",
    "Describir alimentos, bebidas, horarios y cantidades del día anterior.",
  ],
  [
    "eatingHabits",
    "Hábitos de alimentación",
    "Horarios, comidas fuera de casa, preparación y patrones habituales.",
  ],
  [
    "physicalActivity",
    "Actividad física",
    "Tipo, frecuencia, duración e intensidad.",
  ],
  [
    "preferences",
    "Preferencias",
    "Alimentos preferidos, cultura alimentaria y disponibilidad.",
  ],
  [
    "restrictions",
    "Restricciones",
    "Intolerancias, restricciones religiosas, económicas o personales.",
  ],
] as const;

export function HistoryForm({
  patientId,
  health,
  dietary,
}: {
  patientId: string;
  health: Tables<"patient_health_histories"> | null;
  dietary: Tables<"dietary_histories"> | null;
}) {
  const initial: Values = {
    medicalHistory: health?.medical_history ?? "",
    diagnoses: health?.diagnoses ?? "",
    familyHistory: health?.family_history ?? "",
    allergies: health?.allergies ?? "",
    medications: health?.medications ?? "",
    recall24h: dietary?.recall_24h ?? "",
    eatingHabits: dietary?.eating_habits ?? "",
    waterLiters:
      dietary?.water_liters == null ? "" : String(dietary.water_liters),
    sleepHours: dietary?.sleep_hours == null ? "" : String(dietary.sleep_hours),
    physicalActivity: dietary?.physical_activity ?? "",
    preferences: dietary?.preferences ?? "",
    restrictions: dietary?.restrictions ?? "",
  };
  const [values, setValues] = useState(initial);
  const [state, action, pending] = useActionState(
    saveClinicalHistoryAction,
    initialClinicalHistoryState,
  );
  const update = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const field = ([name, label, help]: readonly [string, string, string]) => (
    <div key={name}>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <p className="mb-2 text-xs text-[var(--text-muted)]">{help}</p>
      <textarea
        className="field-input min-h-24 py-3"
        id={name}
        name={name}
        onChange={(e) => update(name, e.target.value)}
        value={values[name]}
      />
      {state.errors?.[name]?.[0] && (
        <p className="mt-1 text-xs text-[var(--danger)]">
          {state.errors[name][0]}
        </p>
      )}
    </div>
  );
  return (
    <form action={action} className="space-y-5" noValidate>
      <input name="patientId" type="hidden" value={patientId} />
      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Antecedentes de salud</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {healthFields.map(field)}
        </div>
      </section>
      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">
          Historia dietética y hábitos
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {dietaryFields.slice(0, 2).map(field)}
          <div>
            <label className="field-label" htmlFor="waterLiters">
              Agua al día (litros)
            </label>
            <input
              className="field-input"
              id="waterLiters"
              max="20"
              min="0"
              name="waterLiters"
              onChange={(e) => update("waterLiters", e.target.value)}
              step="0.1"
              type="number"
              value={values.waterLiters}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="sleepHours">
              Sueño al día (horas)
            </label>
            <input
              className="field-input"
              id="sleepHours"
              max="24"
              min="0"
              name="sleepHours"
              onChange={(e) => update("sleepHours", e.target.value)}
              step="0.1"
              type="number"
              value={values.sleepHours}
            />
          </div>
          {dietaryFields.slice(2).map(field)}
        </div>
      </section>
      {state.message && (
        <div
          className={state.status === "success" ? "form-success" : "form-error"}
        >
          {state.message}
        </div>
      )}
      <div className="flex justify-end">
        <button className="button-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar historia clínica"}
        </button>
      </div>
    </form>
  );
}
