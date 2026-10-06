import Link from "next/link";

import { getReminderCenter } from "@/features/reminders/data";
import {
  reminderChannelLabels,
  reminderKindLabels,
  reminderStatusClass,
  reminderStatusLabels,
} from "@/features/reminders/presentation";
import {
  ReminderSettingsForm,
  TwilioSandboxControl,
} from "@/features/reminders/reminder-settings-form";
import { isTwilioSandboxConfigured } from "@/lib/env/server";
import { formatClinicDate, formatClinicTime } from "@/lib/format";

export const metadata = { title: "Recordatorios" };

function dateTime(value: string) {
  const date = new Date(value);
  return `${formatClinicDate(date)}, ${formatClinicTime(date)}`;
}

export default async function ReminderCenterPage() {
  const record = await getReminderCenter();
  const canConfigure = record.workspace.role !== "assistant";
  const sandboxConfigured = isTwilioSandboxConfigured();
  const blocked = record.reminders.filter(
    (reminder) => reminder.status === "blocked",
  ).length;
  const pending = record.reminders.filter((reminder) =>
    ["queued", "processing"].includes(reminder.status),
  ).length;
  const sent = record.reminders.filter(
    (reminder) => reminder.status === "sent",
  ).length;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/agenda"
      >
        ← Volver a la agenda
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Agenda clínica</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Recordatorios de citas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Revisa las confirmaciones y avisos que Nutri360 programa para cada
          cita.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--line)] bg-[var(--brand-50)] p-4 text-sm leading-6 text-[var(--brand-950)]">
        <strong>
          {sandboxConfigured
            ? "Sandbox de WhatsApp disponible para pruebas."
            : "Programación activa, envío externo pendiente."}
        </strong>{" "}
        {sandboxConfigured
          ? "Solo puede enviar al número de prueba autorizado."
          : "Las citas generan su cola, pero ningún mensaje saldrá hasta completar la configuración de Twilio."}
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="panel h-fit p-5 sm:p-6">
          <p className="eyebrow">Preferencias</p>
          <h2 className="mb-5 mt-2 text-lg font-semibold">
            Programación automática
          </h2>
          {canConfigure ? (
            <ReminderSettingsForm settings={record.settings} />
          ) : (
            <div className="space-y-3 text-sm text-[var(--text-muted)]">
              <p>
                Canal:{" "}
                {reminderChannelLabels[record.settings.preferred_channel]}
              </p>
              <p>
                Solo propietarios y nutricionistas pueden modificar esta
                configuración.
              </p>
            </div>
          )}
        </section>

        <div className="space-y-6">
          {canConfigure && (
            <TwilioSandboxControl
              configured={sandboxConfigured}
              organizationId={record.workspace.id}
            />
          )}
          <section className="grid grid-cols-3 gap-3">
            {[
              ["Programados", pending],
              ["Enviados", sent],
              ["Sin contacto", blocked],
            ].map(([label, value]) => (
              <div className="panel p-4" key={label}>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
              </div>
            ))}
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-header block">
              <p className="eyebrow">Cola operativa</p>
              <h2 className="mt-2 text-lg font-semibold">
                Últimos recordatorios
              </h2>
            </div>
            {record.reminders.length ? (
              <div className="divide-y divide-[var(--line)]">
                {record.reminders.map((reminder) => (
                  <article className="p-5 sm:p-6" key={reminder.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">
                          {reminder.patient
                            ? `${reminder.patient.first_name} ${reminder.patient.last_name}`
                            : "Paciente"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {reminderKindLabels[reminder.kind]} ·{" "}
                          {reminderChannelLabels[reminder.channel]}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${reminderStatusClass(reminder.status)}`}
                      >
                        {reminderStatusLabels[reminder.status]}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs leading-5 text-[var(--text-muted)] sm:grid-cols-2">
                      <p>Programado: {dateTime(reminder.scheduled_at)}</p>
                      <p>
                        Cita:{" "}
                        {reminder.appointment
                          ? dateTime(reminder.appointment.starts_at)
                          : "No disponible"}
                      </p>
                    </div>
                    {reminder.last_error_code === "missing_contact" && (
                      <p className="mt-3 rounded-xl bg-[var(--danger-bg)] px-3 py-2 text-xs leading-5 text-[var(--danger)]">
                        El paciente no tiene el dato de contacto requerido para{" "}
                        {reminderChannelLabels[reminder.channel].toLowerCase()}.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <h3 className="font-semibold">Aún no hay recordatorios</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Programa una cita futura y aquí aparecerán sus avisos.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
