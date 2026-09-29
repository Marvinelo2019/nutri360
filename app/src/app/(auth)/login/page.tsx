import { redirect } from "next/navigation";

import { AuthForm } from "@/features/auth/auth-form";
import { getCurrentContext } from "@/lib/auth/session";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const context = await getCurrentContext();
  if (context) redirect(context.workspace ? "/dashboard" : "/onboarding");

  return (
    <div className="w-full">
      <p className="eyebrow">Acceso profesional</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-[2.15rem]">
        Bienvenido de nuevo
      </h2>
      <p className="mt-3 max-w-md text-[0.95rem] leading-6 text-[var(--text-muted)]">
        Ingresa para continuar con la operación de tu consultorio.
      </p>
      <AuthForm mode="login" />
    </div>
  );
}
