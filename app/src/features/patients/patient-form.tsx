"use client";

import { useActionState } from "react";

import { createPatientAction } from "./actions";
import { initialPatientState } from "./schemas";

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function PatientForm({ canEditClinical }: { canEditClinical: boolean }) {
  const [state, action, pending] = useActionState(
    createPatientAction,
    initialPatientState,
  );
  return (
    <form action={action} className="space-y-6" noValidate>
      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Datos del paciente</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Información administrativa para identificarlo y contactarlo.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="firstName">
              Nombre
            </label>
            <input
              className="field-input"
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              aria-invalid={Boolean(state.errors?.firstName)}
            />
            <ErrorText errors={state.errors?.firstName} />
          </div>
          <div>
            <label className="field-label" htmlFor="lastName">
              Apellido
            </label>
            <input
              className="field-input"
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              aria-invalid={Boolean(state.errors?.lastName)}
            />
            <ErrorText errors={state.errors?.lastName} />
          </div>
          <div>
            <label className="field-label" htmlFor="birthDate">
              Fecha de nacimiento
            </label>
            <input
              className="field-input"
              id="birthDate"
              name="birthDate"
              type="date"
              aria-invalid={Boolean(state.errors?.birthDate)}
            />
            <ErrorText errors={state.errors?.birthDate} />
          </div>
          <div>
            <label className="field-label" htmlFor="growthReferenceSex">
              Sexo de referencia para cálculos
            </label>
            <select
              className="field-input"
              id="growthReferenceSex"
              name="growthReferenceSex"
              defaultValue=""
            >
              <option value="">No especificado</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="phone">
              Teléfono
            </label>
            <input
              className="field-input"
              id="phone"
              name="phone"
              inputMode="tel"
              placeholder="5555 1234"
              autoComplete="tel"
              aria-invalid={Boolean(state.errors?.phone)}
            />
            <ErrorText errors={state.errors?.phone} />
          </div>
          <div>
            <label className="field-label" htmlFor="email">
              Correo electrónico
            </label>
            <input
              className="field-input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(state.errors?.email)}
            />
            <ErrorText errors={state.errors?.email} />
          </div>
        </div>
      </section>

      {canEditClinical && (
        <section className="panel p-5 sm:p-6">
          <h2 className="text-base font-semibold">Contexto clínico inicial</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Un punto de partida breve; la historia clínica se ampliará después.
          </p>
          <div className="mt-5 grid gap-5">
            <div>
              <label className="field-label" htmlFor="consultationReason">
                Motivo de consulta
              </label>
              <textarea
                className="field-input min-h-24 py-3"
                id="consultationReason"
                name="consultationReason"
                maxLength={2000}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="goal">
                Objetivo principal
              </label>
              <textarea
                className="field-input min-h-24 py-3"
                id="goal"
                name="goal"
                maxLength={1000}
              />
            </div>
          </div>
        </section>
      )}

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Consentimiento</h2>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--text-muted)]">
          <input
            className="mt-1 size-4 accent-[var(--brand-700)]"
            type="checkbox"
            name="consent"
            value="accepted"
          />
          <span>
            Confirmo que el paciente autorizó el registro y tratamiento de sus
            datos para la atención nutricional.
          </span>
        </label>
        <ErrorText errors={state.errors?.consent} />
      </section>
      {state.message && <div className="form-error">{state.message}</div>}
      <div className="flex justify-end">
        <button className="button-primary w-full sm:w-auto" disabled={pending}>
          {pending ? "Guardando…" : "Guardar paciente"}
        </button>
      </div>
    </form>
  );
}
