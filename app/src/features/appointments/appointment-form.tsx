"use client";

import { useActionState } from "react";

import type { Database } from "@/types/database";

import { createAppointmentAction } from "./actions";
import { initialAppointmentState } from "./schemas";

type Option = {
  user_id: string;
  full_name: string;
  role: Database["public"]["Enums"]["app_role"];
};
type PatientOption = { id: string; first_name: string; last_name: string };

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function AppointmentForm({
  patients,
  professionals,
  defaultDate,
}: {
  patients: PatientOption[];
  professionals: Option[];
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(
    createAppointmentAction,
    initialAppointmentState,
  );
  return (
    <form action={action} className="panel p-5 sm:p-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
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
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="professionalUserId">
            Profesional
          </label>
          <select
            className="field-input"
            id="professionalUserId"
            name="professionalUserId"
            defaultValue={professionals[0]?.user_id ?? ""}
          >
            <option value="" disabled>
              Seleccionar profesional
            </option>
            {professionals.map((professional) => (
              <option key={professional.user_id} value={professional.user_id}>
                {professional.full_name}
              </option>
            ))}
          </select>
          <ErrorText errors={state.errors?.professionalUserId} />
        </div>
        <div>
          <label className="field-label" htmlFor="date">
            Fecha
          </label>
          <input
            className="field-input"
            id="date"
            name="date"
            type="date"
            defaultValue={defaultDate}
          />
          <ErrorText errors={state.errors?.date} />
        </div>
        <div>
          <label className="field-label" htmlFor="time">
            Hora
          </label>
          <input
            className="field-input"
            id="time"
            name="time"
            type="time"
            defaultValue="09:00"
            step="900"
          />
          <ErrorText errors={state.errors?.time} />
        </div>
        <div>
          <label className="field-label" htmlFor="durationMinutes">
            Duración
          </label>
          <select
            className="field-input"
            id="durationMinutes"
            name="durationMinutes"
            defaultValue="60"
          >
            <option value="30">30 minutos</option>
            <option value="45">45 minutos</option>
            <option value="60">1 hora</option>
            <option value="90">1 hora 30 minutos</option>
            <option value="120">2 horas</option>
          </select>
          <ErrorText errors={state.errors?.durationMinutes} />
        </div>
        <div>
          <label className="field-label" htmlFor="modality">
            Modalidad
          </label>
          <select
            className="field-input"
            id="modality"
            name="modality"
            defaultValue="in_person"
          >
            <option value="in_person">Presencial</option>
            <option value="video">Videollamada</option>
            <option value="phone">Llamada telefónica</option>
          </select>
          <ErrorText errors={state.errors?.modality} />
        </div>
      </div>
      {state.message && (
        <div className="form-error mt-5" role="alert">
          {state.message}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button className="button-primary w-full sm:w-auto" disabled={pending}>
          {pending ? "Programando…" : "Programar cita"}
        </button>
      </div>
    </form>
  );
}
