"use client";

import { useActionState, useState } from "react";

import { formatCurrency } from "@/lib/format";

import {
  consumePackageSessionAction,
  createPackageDefinitionAction,
  sellPatientPackageAction,
} from "./actions";
import { initialPackageFormState } from "./schemas";

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function PackageDefinitionForm() {
  const [state, action, pending] = useActionState(
    createPackageDefinitionAction,
    initialPackageFormState,
  );
  return (
    <form action={action} className="panel p-5 sm:p-6" noValidate>
      <p className="eyebrow">Catálogo</p>
      <h2 className="mt-2 text-lg font-semibold">Crear paquete</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="name">
            Nombre
          </label>
          <input
            className="field-input"
            id="name"
            name="name"
            maxLength={100}
            placeholder="Seguimiento mensual"
          />
          <ErrorText errors={state.errors?.name} />
        </div>
        <div>
          <label className="field-label" htmlFor="sessionCount">
            Sesiones
          </label>
          <input
            className="field-input"
            id="sessionCount"
            name="sessionCount"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            defaultValue={4}
          />
          <ErrorText errors={state.errors?.sessionCount} />
        </div>
        <div>
          <label className="field-label" htmlFor="price">
            Precio (GTQ)
          </label>
          <input
            className="field-input"
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="500.00"
          />
          <ErrorText errors={state.errors?.price} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="validityDays">
            Vigencia en días
          </label>
          <input
            className="field-input"
            id="validityDays"
            name="validityDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={730}
            defaultValue={90}
          />
          <ErrorText errors={state.errors?.validityDays} />
        </div>
      </div>
      {state.message && (
        <div
          className={`mt-5 ${state.status === "success" ? "form-success" : "form-error"}`}
          role="status"
        >
          {state.message}
        </div>
      )}
      <button className="button-primary mt-5 w-full" disabled={pending}>
        {pending ? "Creando…" : "Crear paquete"}
      </button>
    </form>
  );
}

type PackageOption = {
  id: string;
  name: string;
  price_centavos: number;
  session_count: number;
  validity_days: number;
};
type PatientOption = { id: string; first_name: string; last_name: string };

export function SellPackageForm({
  packages,
  patients,
  defaultDate,
  defaultPatientId,
}: {
  packages: PackageOption[];
  patients: PatientOption[];
  defaultDate: string;
  defaultPatientId?: string;
}) {
  const [recordPayment, setRecordPayment] = useState(true);
  const [state, action, pending] = useActionState(
    sellPatientPackageAction,
    initialPackageFormState,
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
            defaultValue={defaultPatientId ?? ""}
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
          <label className="field-label" htmlFor="packageId">
            Paquete
          </label>
          <select
            className="field-input"
            id="packageId"
            name="packageId"
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar paquete
            </option>
            {packages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.session_count} sesiones ·{" "}
                {formatCurrency(item.price_centavos)}
              </option>
            ))}
          </select>
          <ErrorText errors={state.errors?.packageId} />
        </div>
        <div>
          <label className="field-label" htmlFor="purchaseDate">
            Fecha de compra
          </label>
          <input
            className="field-input"
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            defaultValue={defaultDate}
            max={defaultDate}
          />
          <ErrorText errors={state.errors?.purchaseDate} />
        </div>
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line)] px-4 text-sm font-medium">
          <input
            name="createPayment"
            type="checkbox"
            defaultChecked
            onChange={(event) => setRecordPayment(event.target.checked)}
          />
          Registrar pago asociado
        </label>
        {recordPayment && (
          <>
            <div>
              <label className="field-label" htmlFor="paymentMethod">
                Método
              </label>
              <select
                className="field-input"
                id="paymentMethod"
                name="paymentMethod"
                defaultValue="cash"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="paymentStatus">
                Estado del pago
              </label>
              <select
                className="field-input"
                id="paymentStatus"
                name="paymentStatus"
                defaultValue="paid"
              >
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="paymentReference">
                Referencia opcional
              </label>
              <input
                className="field-input"
                id="paymentReference"
                name="paymentReference"
                maxLength={100}
                placeholder="Número de transferencia o recibo"
              />
            </div>
          </>
        )}
      </div>
      {!recordPayment && (
        <input type="hidden" name="paymentMethod" value="cash" />
      )}
      {!recordPayment && (
        <input type="hidden" name="paymentStatus" value="pending" />
      )}
      {state.message && (
        <div className="form-error mt-5" role="status">
          {state.message}
        </div>
      )}
      <button className="button-primary mt-6 w-full" disabled={pending}>
        {pending ? "Registrando…" : "Vender paquete"}
      </button>
    </form>
  );
}

export function ConsumeSessionForm({
  patientPackageId,
  appointments,
}: {
  patientPackageId: string;
  appointments: Array<{ id: string; starts_at: string }>;
}) {
  const [state, action, pending] = useActionState(
    consumePackageSessionAction,
    initialPackageFormState,
  );
  const dateTime = new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guatemala",
  });
  return (
    <form action={action} className="panel p-5 sm:p-6" noValidate>
      <input type="hidden" name="patientPackageId" value={patientPackageId} />
      <h2 className="text-base font-semibold">Descontar una sesión</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Solo aparecen citas completadas y todavía no cargadas a otro paquete.
      </p>
      <label className="field-label mt-5" htmlFor="appointmentId">
        Cita completada
      </label>
      <select
        className="field-input"
        id="appointmentId"
        name="appointmentId"
        defaultValue=""
      >
        <option value="" disabled>
          Seleccionar cita
        </option>
        {appointments.map((appointment) => (
          <option key={appointment.id} value={appointment.id}>
            {dateTime.format(new Date(appointment.starts_at))}
          </option>
        ))}
      </select>
      <ErrorText errors={state.errors?.appointmentId} />
      {state.message && (
        <div
          className={`mt-4 ${state.status === "success" ? "form-success" : "form-error"}`}
          role="status"
        >
          {state.message}
        </div>
      )}
      <button
        className="button-primary mt-5 w-full"
        disabled={pending || appointments.length === 0}
      >
        {pending ? "Descontando…" : "Descontar sesión"}
      </button>
    </form>
  );
}
