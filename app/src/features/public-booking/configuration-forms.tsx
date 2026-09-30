"use client";

import { useActionState, useState } from "react";

import type { Database } from "@/types/database";

import {
  createAvailabilityBlockAction,
  createAvailabilityRuleAction,
  savePublicBookingSettingsAction,
} from "./actions";
import { initialBookingFormState } from "./schemas";

type Professional = {
  full_name: string;
  role: Database["public"]["Enums"]["app_role"];
  user_id: string;
};

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

function Feedback({ status, message }: { status: string; message?: string }) {
  return message ? (
    <div
      className={status === "success" ? "form-success" : "form-error"}
      role="status"
    >
      {message}
    </div>
  ) : null;
}

export function CopyBookingLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 overflow-hidden text-ellipsis rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
        {path}
      </code>
      <button
        className="button-secondary min-h-12"
        onClick={copy}
        type="button"
      >
        {copied ? "Enlace copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}

export function BookingSettingsForm({
  settings,
}: {
  settings: Database["public"]["Tables"]["public_booking_settings"]["Row"];
}) {
  const [state, action, pending] = useActionState(
    savePublicBookingSettingsAction,
    initialBookingFormState,
  );
  return (
    <form action={action} className="space-y-5" noValidate>
      <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
        <input
          className="mt-1 size-4 accent-[var(--brand-700)]"
          defaultChecked={settings.is_enabled}
          name="enabled"
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-semibold">
            Activar enlace público
          </span>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
            Solo mostrará horarios después de configurar disponibilidad.
          </span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="durationMinutes">
            Duración de cada cita
          </label>
          <select
            className="field-input"
            defaultValue={settings.appointment_duration_minutes}
            id="durationMinutes"
            name="durationMinutes"
          >
            {[30, 45, 60, 90, 120].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutos
              </option>
            ))}
          </select>
          <ErrorText errors={state.errors?.durationMinutes} />
        </div>
        <div>
          <label className="field-label" htmlFor="modality">
            Modalidad predeterminada
          </label>
          <select
            className="field-input"
            defaultValue={settings.default_modality}
            id="modality"
            name="modality"
          >
            <option value="in_person">Presencial</option>
            <option value="video">Videollamada</option>
            <option value="phone">Llamada telefónica</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="noticeHours">
            Anticipación mínima
          </label>
          <select
            className="field-input"
            defaultValue={settings.minimum_notice_hours}
            id="noticeHours"
            name="noticeHours"
          >
            {[1, 2, 4, 12, 24, 48, 72].map((hours) => (
              <option key={hours} value={hours}>
                {hours} {hours === 1 ? "hora" : "horas"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="horizonDays">
            Días disponibles hacia adelante
          </label>
          <input
            className="field-input"
            defaultValue={settings.booking_horizon_days}
            id="horizonDays"
            max="120"
            min="7"
            name="horizonDays"
            type="number"
          />
          <ErrorText errors={state.errors?.horizonDays} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="instructions">
          Indicaciones públicas
        </label>
        <textarea
          className="field-input min-h-28 py-3"
          defaultValue={settings.public_instructions ?? ""}
          id="instructions"
          maxLength={1000}
          name="instructions"
          placeholder="Ej. Te contactaremos para confirmar la cita."
        />
        <ErrorText errors={state.errors?.instructions} />
      </div>
      <Feedback message={state.message} status={state.status} />
      <button className="button-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}

export function AvailabilityRuleForm({
  professionals,
}: {
  professionals: Professional[];
}) {
  const [state, action, pending] = useActionState(
    createAvailabilityRuleAction,
    initialBookingFormState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="rule-professional">
          Profesional
        </label>
        <select
          className="field-input"
          defaultValue={professionals[0]?.user_id ?? ""}
          id="rule-professional"
          name="professionalUserId"
        >
          {professionals.map((professional) => (
            <option key={professional.user_id} value={professional.user_id}>
              {professional.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="weekday">
          Día
        </label>
        <select className="field-input" id="weekday" name="weekday">
          <option value="1">Lunes</option>
          <option value="2">Martes</option>
          <option value="3">Miércoles</option>
          <option value="4">Jueves</option>
          <option value="5">Viernes</option>
          <option value="6">Sábado</option>
          <option value="0">Domingo</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="startTime">
          Desde
        </label>
        <input
          className="field-input"
          defaultValue="09:00"
          id="startTime"
          name="startTime"
          type="time"
        />
      </div>
      <div>
        <label className="field-label" htmlFor="endTime">
          Hasta
        </label>
        <input
          className="field-input"
          defaultValue="17:00"
          id="endTime"
          name="endTime"
          type="time"
        />
        <ErrorText errors={state.errors?.endTime} />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <Feedback message={state.message} status={state.status} />
        <button className="button-secondary min-h-12" disabled={pending}>
          {pending ? "Agregando…" : "Agregar horario semanal"}
        </button>
      </div>
    </form>
  );
}

export function AvailabilityBlockForm({
  professionals,
}: {
  professionals: Professional[];
}) {
  const [state, action, pending] = useActionState(
    createAvailabilityBlockAction,
    initialBookingFormState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="block-professional">
          Profesional
        </label>
        <select
          className="field-input"
          defaultValue={professionals[0]?.user_id ?? ""}
          id="block-professional"
          name="professionalUserId"
        >
          {professionals.map((professional) => (
            <option key={professional.user_id} value={professional.user_id}>
              {professional.full_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="startsAt">
          Inicio
        </label>
        <input
          className="field-input"
          id="startsAt"
          name="startsAt"
          type="datetime-local"
        />
      </div>
      <div>
        <label className="field-label" htmlFor="endsAt">
          Final
        </label>
        <input
          className="field-input"
          id="endsAt"
          name="endsAt"
          type="datetime-local"
        />
        <ErrorText errors={state.errors?.endsAt} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="label">
          Motivo interno opcional
        </label>
        <input
          className="field-input"
          id="label"
          maxLength={120}
          name="label"
          placeholder="Ej. Vacaciones"
        />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <Feedback message={state.message} status={state.status} />
        <button className="button-secondary min-h-12" disabled={pending}>
          {pending ? "Agregando…" : "Bloquear período"}
        </button>
      </div>
    </form>
  );
}
