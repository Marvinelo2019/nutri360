"use client";

import { useActionState, useMemo, useState } from "react";

import { createPublicBookingAction } from "./actions";
import { initialBookingFormState } from "./schemas";

type Slot = {
  date_key: string;
  date_label: string;
  ends_at: string;
  professional_name: string;
  professional_user_id: string;
  starts_at: string;
  time_label: string;
};

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function PublicBookingForm({
  clinicName,
  consentVersion,
  slug,
  slots,
}: {
  clinicName: string;
  consentVersion: string;
  slug: string;
  slots: Slot[];
}) {
  const [selectedKey, setSelectedKey] = useState(
    slots[0] ? `${slots[0].professional_user_id}|${slots[0].starts_at}` : "",
  );
  const selected = slots.find(
    (slot) => `${slot.professional_user_id}|${slot.starts_at}` === selectedKey,
  );
  const [state, action, pending] = useActionState(
    createPublicBookingAction.bind(null, slug),
    initialBookingFormState,
  );
  const groups = useMemo(() => {
    const result = new Map<string, Slot[]>();
    for (const slot of slots) {
      result.set(slot.date_key, [...(result.get(slot.date_key) ?? []), slot]);
    }
    return [...result.entries()];
  }, [slots]);

  if (state.status === "success") {
    return (
      <section className="panel p-6 text-center sm:p-8" role="status">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--success-bg)] text-xl text-[var(--success)]">
          ✓
        </span>
        <h2 className="mt-4 text-xl font-semibold">Solicitud enviada</h2>
        {selected && (
          <p className="mt-3 text-sm font-semibold text-[var(--brand-700)]">
            {selected.date_label} · {selected.time_label}
          </p>
        )}
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">
          {state.message ||
            `${clinicName} recibió tu solicitud y deberá confirmar la cita.`}
        </p>
      </section>
    );
  }

  return (
    <form action={action} className="space-y-6" noValidate>
      <section className="panel p-5 sm:p-6">
        <p className="eyebrow">Paso 1</p>
        <h2 className="mt-2 text-lg font-semibold">Selecciona un horario</h2>
        <div className="mt-5 space-y-6">
          {groups.map(([date, dateSlots]) => (
            <fieldset key={date}>
              <legend className="mb-3 text-sm font-semibold">
                {dateSlots[0].date_label}
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dateSlots.map((slot) => {
                  const key = `${slot.professional_user_id}|${slot.starts_at}`;
                  const active = selectedKey === key;
                  return (
                    <label
                      className={`cursor-pointer rounded-xl border px-3 py-3 text-center transition ${
                        active
                          ? "border-[var(--brand-600)] bg-[var(--brand-50)] ring-2 ring-[var(--brand-100)]"
                          : "border-[var(--line)] bg-white hover:border-[var(--line-strong)]"
                      }`}
                      key={key}
                    >
                      <input
                        checked={active}
                        className="sr-only"
                        name="slotChoice"
                        onChange={() => setSelectedKey(key)}
                        type="radio"
                        value={key}
                      />
                      <span className="block text-sm font-semibold">
                        {slot.time_label}
                      </span>
                      <span className="mt-1 block truncate text-[0.68rem] text-[var(--text-muted)]">
                        {slot.professional_name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <input
          name="professionalUserId"
          type="hidden"
          value={selected?.professional_user_id ?? ""}
        />
        <input
          name="startsAt"
          type="hidden"
          value={selected?.starts_at ?? ""}
        />
        <ErrorText errors={state.errors?.professionalUserId} />
      </section>

      <section className="panel p-5 sm:p-6">
        <p className="eyebrow">Paso 2</p>
        <h2 className="mt-2 text-lg font-semibold">Tus datos de contacto</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          Solo los usaremos para identificarte y coordinar esta cita.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="firstName">
              Nombre
            </label>
            <input
              autoComplete="given-name"
              className="field-input"
              defaultValue={state.values?.firstName}
              id="firstName"
              maxLength={80}
              name="firstName"
            />
            <ErrorText errors={state.errors?.firstName} />
          </div>
          <div>
            <label className="field-label" htmlFor="lastName">
              Apellido
            </label>
            <input
              autoComplete="family-name"
              className="field-input"
              defaultValue={state.values?.lastName}
              id="lastName"
              maxLength={80}
              name="lastName"
            />
            <ErrorText errors={state.errors?.lastName} />
          </div>
          <div>
            <label className="field-label" htmlFor="birthDate">
              Fecha de nacimiento
            </label>
            <input
              autoComplete="bday"
              className="field-input"
              defaultValue={state.values?.birthDate}
              id="birthDate"
              name="birthDate"
              type="date"
            />
            <ErrorText errors={state.errors?.birthDate} />
          </div>
          <div>
            <label className="field-label" htmlFor="phone">
              Teléfono
            </label>
            <input
              autoComplete="tel"
              className="field-input"
              defaultValue={state.values?.phone}
              id="phone"
              inputMode="tel"
              name="phone"
              placeholder="5555 5555"
            />
            <ErrorText errors={state.errors?.phone} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="email">
              Correo electrónico opcional
            </label>
            <input
              autoComplete="email"
              className="field-input"
              defaultValue={state.values?.email}
              id="email"
              maxLength={254}
              name="email"
              type="email"
            />
            <ErrorText errors={state.errors?.email} />
          </div>
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm leading-6">
          <input
            className="mt-1 size-4 shrink-0 accent-[var(--brand-700)]"
            name="consent"
            type="checkbox"
          />
          <span>
            Autorizo a {clinicName} a usar estos datos para gestionar y
            contactarme sobre esta solicitud de cita. Aviso {consentVersion}.
          </span>
        </label>
        <ErrorText errors={state.errors?.consent} />

        {state.message && (
          <div className="form-error mt-5" role="alert">
            {state.message}
          </div>
        )}
        <button
          className="button-primary mt-6 w-full"
          disabled={pending || !selected}
        >
          {pending ? "Enviando solicitud…" : "Solicitar cita"}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-[var(--text-faint)]">
          La cita quedará pendiente hasta que la clínica la confirme.
        </p>
      </section>
    </form>
  );
}
