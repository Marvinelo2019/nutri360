"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, registerAction } from "./actions";
import { initialAuthFormState } from "./schemas";

type AuthFormProps = { mode: "login" | "register" };

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;

  return (
    <p className="mt-1.5 text-sm text-[var(--danger)]" role="alert">
      {messages[0]}
    </p>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialAuthFormState,
  );
  const isLogin = mode === "login";

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      {!isLogin && (
        <div>
          <label className="field-label" htmlFor="fullName">
            Nombre completo
          </label>
          <input
            className="field-input"
            id="fullName"
            name="fullName"
            placeholder="Ej. Andrea Morales"
            autoComplete="name"
            aria-invalid={Boolean(state.errors?.fullName)}
          />
          <FieldError messages={state.errors?.fullName} />
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="email">
          Correo electrónico
        </label>
        <input
          className="field-input"
          id="email"
          name="email"
          type="email"
          placeholder="nombre@clinica.com"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(state.errors?.email)}
        />
        <FieldError messages={state.errors?.email} />
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label className="field-label" htmlFor="password">
            Contraseña
          </label>
          {isLogin && (
            <span className="text-xs text-[var(--text-muted)]">
              Recuperación próximamente
            </span>
          )}
        </div>
        <input
          className="field-input"
          id="password"
          name="password"
          type="password"
          placeholder={isLogin ? "Tu contraseña" : "Mínimo 8 caracteres"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          aria-invalid={Boolean(state.errors?.password)}
        />
        <FieldError messages={state.errors?.password} />
      </div>

      {!isLogin && (
        <div>
          <label className="field-label" htmlFor="confirmPassword">
            Confirmar contraseña
          </label>
          <input
            className="field-input"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            aria-invalid={Boolean(state.errors?.confirmPassword)}
          />
          <FieldError messages={state.errors?.confirmPassword} />
        </div>
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
        className="button-primary w-full"
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Procesando…"
          : isLogin
            ? "Ingresar a Nutri360"
            : "Crear mi cuenta"}
      </button>

      <p className="text-center text-sm text-[var(--text-muted)]">
        {isLogin ? "¿Aún no tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
        <Link
          className="font-semibold text-[var(--brand-700)] underline-offset-4 hover:underline"
          href={isLogin ? "/registro" : "/login"}
        >
          {isLogin ? "Crear cuenta" : "Iniciar sesión"}
        </Link>
      </p>
    </form>
  );
}
