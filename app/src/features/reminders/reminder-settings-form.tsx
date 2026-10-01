"use client";

import { useActionState } from "react";

import type { Database } from "@/types/database";

import { saveReminderSettingsAction } from "./actions";
import { initialReminderSettingsState } from "./schemas";

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
