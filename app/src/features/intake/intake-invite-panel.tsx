"use client";

import { useActionState, useState } from "react";

import { createIntakeInviteAction, revokeIntakeInviteAction } from "./actions";
import { initialIntakeFormState } from "./schemas";

type Invite = {
  completed_at: string | null;
  created_at: string;
  expires_at: string;
  id: string;
  revoked_at: string | null;
};

const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

function inviteStatus(invite: Invite) {
  if (invite.completed_at) return "Completado";
  if (invite.revoked_at) return "Revocado";
  if (new Date(invite.expires_at) <= new Date()) return "Vencido";
  return "Activo";
}

export function IntakeInvitePanel({
  invites,
  patientId,
}: {
  invites: Invite[];
  patientId: string;
}) {
  const [state, action, pending] = useActionState(
    createIntakeInviteAction,
    initialIntakeFormState,
  );
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!state.path) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}${state.path}`,
    );
    setCopied(true);
  }

  return (
    <section className="panel p-5 sm:p-6">
      <p className="eyebrow">Antes de la consulta</p>
      <h2 className="mt-2 text-lg font-semibold">Enlace de preconsulta</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Crea un enlace de un solo uso. Las respuestas quedarán separadas de la
        historia clínica hasta que un profesional las revise.
      </p>
      <form
        action={action}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <input name="patientId" type="hidden" value={patientId} />
        <div className="w-full sm:max-w-48">
          <label className="field-label" htmlFor="expiryDays">
            Vigencia
          </label>
          <select
            className="field-input"
            defaultValue="7"
            id="expiryDays"
            name="expiryDays"
          >
            <option value="3">3 días</option>
            <option value="7">7 días</option>
            <option value="14">14 días</option>
            <option value="30">30 días</option>
          </select>
        </div>
        <button className="button-primary" disabled={pending}>
          {pending ? "Creando…" : "Crear enlace"}
        </button>
      </form>
      {state.message && (
        <div
          className={
            state.status === "success" ? "form-success mt-4" : "form-error mt-4"
          }
        >
          {state.message}
        </div>
      )}
      {state.path && (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <p className="break-all text-sm">{state.path}</p>
          <button
            className="button-secondary mt-3"
            onClick={copyLink}
            type="button"
          >
            {copied ? "Enlace copiado" : "Copiar enlace completo"}
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <h3 className="text-sm font-semibold">Invitaciones recientes</h3>
        {invites.length ? (
          <ul className="mt-3 divide-y divide-[var(--line)]">
            {invites.map((invite) => {
              const status = inviteStatus(invite);
              return (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  key={invite.id}
                >
                  <div>
                    <p className="font-medium">{status}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Creado {dateFormat.format(new Date(invite.created_at))} ·
                      vence {dateFormat.format(new Date(invite.expires_at))}
                    </p>
                  </div>
                  {status === "Activo" && (
                    <form
                      action={revokeIntakeInviteAction.bind(
                        null,
                        invite.id,
                        patientId,
                      )}
                    >
                      <button className="button-secondary" type="submit">
                        Revocar
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Aún no se han creado invitaciones.
          </p>
        )}
      </div>
    </section>
  );
}
