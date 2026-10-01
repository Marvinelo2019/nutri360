"use client";

import { useActionState, useState } from "react";

import { updateBrandingAction } from "./branding-actions";
import { initialBrandingFormState } from "./branding-schemas";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg"]);

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]" role="alert">
      {errors[0]}
    </p>
  ) : null;
}

export function BrandingForm({
  brandColor,
  hasLogo,
  name,
  phone,
}: {
  brandColor: string;
  hasLogo: boolean;
  name: string;
  phone: string;
}) {
  const [logoError, setLogoError] = useState<string>();
  const [state, action, pending] = useActionState(
    updateBrandingAction,
    initialBrandingFormState,
  );
  return (
    <form action={action} className="panel space-y-5 p-5 sm:p-6" noValidate>
      <div>
        <label className="field-label" htmlFor="brand-name">
          Nombre del consultorio
        </label>
        <input
          className="field-input"
          defaultValue={name}
          id="brand-name"
          maxLength={120}
          name="name"
        />
        <ErrorText errors={state.errors?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="brand-color">
            Color principal
          </label>
          <div className="flex gap-3">
            <input
              className="h-12 w-16 cursor-pointer rounded-xl border border-[var(--line-strong)] bg-white p-1"
              defaultValue={brandColor}
              id="brand-color"
              name="brandColor"
              type="color"
            />
            <span className="grid h-12 flex-1 place-items-center rounded-xl bg-[var(--surface-muted)] text-sm text-[var(--text-muted)]">
              Se usará en encabezados y detalles del PDF
            </span>
          </div>
          <ErrorText errors={state.errors?.brandColor} />
        </div>
        <div>
          <label className="field-label" htmlFor="brand-phone">
            Teléfono opcional
          </label>
          <input
            className="field-input"
            defaultValue={phone}
            id="brand-phone"
            name="phoneE164"
            placeholder="+50255555555"
            type="tel"
          />
          <ErrorText errors={state.errors?.phoneE164} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="brand-logo">
          Logo opcional
        </label>
        <input
          accept="image/png,image/jpeg"
          className="field-input py-2.5"
          id="brand-logo"
          name="logo"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) {
              setLogoError(undefined);
              return;
            }
            if (!ALLOWED_LOGO_TYPES.has(file.type)) {
              setLogoError("El logo debe ser PNG o JPEG.");
              event.currentTarget.value = "";
              return;
            }
            if (file.size > MAX_LOGO_BYTES) {
              setLogoError("El logo no puede superar 2 MB.");
              event.currentTarget.value = "";
              return;
            }
            setLogoError(undefined);
          }}
          type="file"
        />
        <p className="mt-1.5 text-xs text-[var(--text-faint)]">
          PNG o JPEG, máximo 2 MB. Se mostrará en el encabezado del PDF.
        </p>
        {logoError && (
          <p className="mt-1.5 text-sm text-[var(--danger)]" role="alert">
            {logoError}
          </p>
        )}
      </div>
      {hasLogo && (
        <label className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <input className="size-4" name="removeLogo" type="checkbox" />
          Quitar el logo actual
        </label>
      )}
      {state.message && (
        <div
          className={state.status === "success" ? "form-success" : "form-error"}
          role="status"
        >
          {state.message}
        </div>
      )}
      <button
        className="button-primary"
        disabled={pending || Boolean(logoError)}
      >
        {pending ? "Guardando…" : "Guardar identidad visual"}
      </button>
    </form>
  );
}
