"use client";

import { useActionState } from "react";

import type { Database } from "@/types/database";

import {
  runTwilioSandboxOnceAction,
  saveReminderSettingsAction,
} from "./actions";
import {
  initialReminderSettingsState,
  initialSandboxTestState,
} from "./schemas";

type Settings = Database["public"]["Tables"]["reminder_settings"]["Row"];

function Switch({
  defaultChecked,
  description,
  label,
  name,
}: {
  defaultChecked: boolean;
  description: string;
  label: string;
  name: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
      <input
        className="mt-1 size-4 accent-[var(--brand-700)]"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </span>
    </label>
  );
}

export function ReminderSettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(
    saveReminderSettingsAction,
    initialReminderSettingsState,
  );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="channel">
          Canal preferido
        </label>
        <select
          className="field-input"
          defaultValue={settings.preferred_channel}
          id="channel"
          name="channel"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="email">Correo electrónico</option>
        </select>
        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
          Nutri360 preparará la cola; el envío comenzará cuando conectemos el
          proveedor de este canal.
        </p>
      </div>
      <Switch
        defaultChecked={settings.confirmation_enabled}
        description="Se programa en el momento de crear la cita."
        label="Confirmación de reserva"
        name="confirmationEnabled"
      />
      <Switch
        defaultChecked={settings.reminder_24h_enabled}
        description="Se programa 24 horas antes, si todavía hay tiempo."
        label="Recordatorio de 24 horas"
        name="reminder24hEnabled"
      />
      <Switch
        defaultChecked={settings.reminder_2h_enabled}
        description="Se programa 2 horas antes, si todavía hay tiempo."
        label="Recordatorio de 2 horas"
        name="reminder2hEnabled"
      />
      {state.message && (
        <div
          className={state.status === "success" ? "form-success" : "form-error"}
          role="status"
        >
          {state.message}
        </div>
      )}
      <button className="button-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}

export function TwilioSandboxControl({
  configured,
  organizationId,
}: {
  configured: boolean;
  organizationId: string;
}) {
  const [state, action, pending] = useActionState(
    runTwilioSandboxOnceAction,
    initialSandboxTestState,
  );
  return (
    <section className="panel p-5 sm:p-6">
      <p className="eyebrow">Prueba controlada</p>
      <h2 className="mt-2 text-lg font-semibold">Twilio WhatsApp Sandbox</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Solo procesará un recordatorio vencido cuyo paciente tenga exactamente
        el número de prueba configurado. No enviará mensajes a otros pacientes.
      </p>
      {configured ? (
        <form action={action} className="mt-4">
          <button className="button-secondary" disabled={pending}>
            {pending ? "Enviando…" : "Enviar un recordatorio de prueba"}
          </button>
        </form>
      ) : (
        <div className="mt-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
          <p>
            Pendiente: agrega las credenciales y el único número autorizado en
            el archivo local de ambiente, luego reinicia Nutri360.
          </p>
          <code className="mt-2 block break-all text-[0.68rem]">
            TWILIO_SANDBOX_ORGANIZATION_ID={organizationId}
          </code>
        </div>
      )}
      {state.message && (
        <div
          className={`mt-4 ${state.status === "success" ? "form-success" : "form-error"}`}
          role="status"
        >
          {state.message}
        </div>
      )}
    </section>
  );
}
