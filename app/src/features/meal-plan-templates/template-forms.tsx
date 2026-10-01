"use client";

import { useActionState } from "react";

import {
  createPlanFromTemplateAction,
  saveMealPlanAsTemplateAction,
} from "./actions";
import { initialTemplateFormState } from "./schemas";

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function SavePlanTemplateForm({
  defaultName,
  planId,
}: {
  defaultName: string;
  planId: string;
}) {
  const [state, action, pending] = useActionState(
    saveMealPlanAsTemplateAction,
    initialTemplateFormState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input name="planId" type="hidden" value={planId} />
      <div>
        <label className="field-label" htmlFor="template-name">
          Nombre de la plantilla
        </label>
        <input
          className="field-input"
          defaultValue={defaultName}
          id="template-name"
          maxLength={120}
          name="name"
        />
        <ErrorText errors={state.errors?.name} />
      </div>
      <div>
        <label className="field-label" htmlFor="template-category">
          Categoría opcional
        </label>
        <input
          className="field-input"
          id="template-category"
          maxLength={80}
          name="category"
          placeholder="Ej. Mantenimiento"
        />
        <ErrorText errors={state.errors?.category} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="template-description">
          Descripción opcional
        </label>
        <textarea
          className="field-input min-h-24 py-3"
          id="template-description"
          maxLength={500}
          name="description"
          placeholder="Cuándo conviene utilizar esta estructura."
        />
        <ErrorText errors={state.errors?.description} />
      </div>
      {state.message && (
        <div className="form-error sm:col-span-2">{state.message}</div>
      )}
      <div className="sm:col-span-2">
        <button className="button-secondary min-h-12" disabled={pending}>
          {pending ? "Guardando…" : "Guardar como plantilla"}
        </button>
      </div>
    </form>
  );
}

type Patient = { id: string; first_name: string; last_name: string };

export function UseTemplateForm({
  defaultName,
  patients,
  templateId,
}: {
  defaultName: string;
  patients: Patient[];
  templateId: string;
}) {
  const [state, action, pending] = useActionState(
    createPlanFromTemplateAction,
    initialTemplateFormState,
  );
  return (
    <form action={action} className="panel space-y-5 p-5 sm:p-6" noValidate>
      <input name="templateId" type="hidden" value={templateId} />
      <div>
        <label className="field-label" htmlFor="patientId">
          Paciente
        </label>
        <select
          className="field-input"
          id="patientId"
          name="patientId"
          defaultValue=""
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
          Nombre del nuevo plan
        </label>
        <input
          className="field-input"
          defaultValue={defaultName}
          id="name"
          maxLength={120}
          name="name"
        />
        <ErrorText errors={state.errors?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="startsOn">
            Fecha inicial opcional
          </label>
          <input
            className="field-input"
            id="startsOn"
            name="startsOn"
            type="date"
          />
          <ErrorText errors={state.errors?.startsOn} />
        </div>
        <div>
          <label className="field-label" htmlFor="endsOn">
            Fecha final opcional
          </label>
          <input
            className="field-input"
            id="endsOn"
            name="endsOn"
            type="date"
          />
          <ErrorText errors={state.errors?.endsOn} />
        </div>
      </div>
      {state.message && <div className="form-error">{state.message}</div>}
      <button className="button-primary w-full" disabled={pending}>
        {pending ? "Creando borrador…" : "Crear borrador desde plantilla"}
      </button>
    </form>
  );
}
