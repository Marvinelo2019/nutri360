"use client";

import { useActionState, useState } from "react";

import { createConsultationAction } from "./actions";
import { initialConsultationState } from "./schemas";

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function ConsultationCreateForm({
  patientId,
  defaultDate,
  defaultTime,
}: {
  patientId: string;
  defaultDate: string;
  defaultTime: string;
}) {
  const [state, action, pending] = useActionState(
    createConsultationAction,
    initialConsultationState,
  );
  const [consultationType, setConsultationType] = useState("initial");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  return (
    <form action={action} className="panel p-5 sm:p-6" noValidate>
      <input name="patientId" type="hidden" value={patientId} />
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="field-label" htmlFor="consultationType">
            Tipo de consulta
          </label>
          <select
            className="field-input"
            id="consultationType"
            name="consultationType"
            onChange={(event) => setConsultationType(event.target.value)}
            value={consultationType}
          >
            <option value="initial">Consulta inicial</option>
            <option value="follow_up">Seguimiento</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="date">
            Fecha
          </label>
          <input
            className="field-input"
            id="date"
            name="date"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
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
            onChange={(event) => setTime(event.target.value)}
            type="time"
            value={time}
          />
          <ErrorText errors={state.errors?.time} />
        </div>
      </div>
      {state.message && <div className="form-error mt-5">{state.message}</div>}
      <div className="mt-6 flex justify-end">
        <button className="button-primary" disabled={pending}>
          {pending ? "Abriendo…" : "Abrir consulta"}
        </button>
      </div>
    </form>
  );
}
