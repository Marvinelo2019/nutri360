"use client";

import { useActionState } from "react";

import { createOrganizationAction } from "./actions";
import { initialOrganizationFormState } from "./schemas";

export function OrganizationForm() {
  const [state, action, pending] = useActionState(
    createOrganizationAction,
    initialOrganizationFormState,
  );

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <div>
        <label className="field-label" htmlFor="name">
          Nombre del consultorio
        </label>
        <input
          className="field-input"
          id="name"
          name="name"
          placeholder="Ej. Nutrición Integral"
          autoComplete="organization"
          autoFocus
          aria-invalid={Boolean(state.errors?.name)}
        />
        {state.errors?.name && (
          <p className="mt-1.5 text-sm text-[var(--danger)]" role="alert">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3.5 text-sm leading-6 text-[var(--text-muted)]">
        Usaremos Guatemala, GTQ y la zona horaria America/Guatemala como
        configuración inicial. Podrás cambiar la identidad visual después.
      </div>

      {state.message && (
        <div className="form-error" role="alert">
          {state.message}
        </div>
      )}

      <button
        className="button-primary w-full"
        disabled={pending}
        type="submit"
      >
        {pending ? "Creando consultorio…" : "Crear consultorio y continuar"}
      </button>
    </form>
  );
}
