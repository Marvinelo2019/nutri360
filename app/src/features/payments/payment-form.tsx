"use client";

import { useActionState } from "react";

import { createPaymentAction } from "./actions";
import { initialPaymentState } from "./schemas";

type PatientOption = { id: string; first_name: string; last_name: string };
function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function PaymentForm({
  patients,
  defaultDate,
}: {
  patients: PatientOption[];
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(
    createPaymentAction,
    initialPaymentState,
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
        <div>
          <label className="field-label" htmlFor="amount">
            Monto (GTQ)
          </label>
          <input
            className="field-input"
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="350.00"
          />
          <ErrorText errors={state.errors?.amount} />
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
            max={defaultDate}
          />
          <ErrorText errors={state.errors?.date} />
        </div>
        <div>
          <label className="field-label" htmlFor="method">
            Método
          </label>
          <select
            className="field-input"
            id="method"
            name="method"
            defaultValue="cash"
          >
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="status">
            Estado
          </label>
          <select
            className="field-input"
            id="status"
            name="status"
            defaultValue="paid"
          >
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="reference">
            Referencia opcional
          </label>
          <input
            className="field-input"
            id="reference"
            name="reference"
            maxLength={100}
            placeholder="Número de transferencia o recibo"
          />
        </div>
      </div>
      {state.message && <div className="form-error mt-5">{state.message}</div>}
      <div className="mt-6 flex justify-end">
        <button className="button-primary w-full sm:w-auto" disabled={pending}>
          {pending ? "Registrando…" : "Registrar pago"}
        </button>
      </div>
    </form>
  );
}
