import { redirect } from "next/navigation";

import { AuthForm } from "@/features/auth/auth-form";
import { getCurrentContext } from "@/lib/auth/session";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  const context = await getCurrentContext();
  if (context) redirect(context.workspace ? "/dashboard" : "/onboarding");

  return (
    <div className="w-full">
      <p className="eyebrow">Comienza con Nutri360</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-[2.15rem]">
        Crea tu cuenta profesional
      </h2>
      <p className="mt-3 max-w-md text-[0.95rem] leading-6 text-[var(--text-muted)]">
        Configura un espacio privado para administrar tu práctica nutricional.
      </p>
      <AuthForm mode="register" />
      <p className="mt-6 text-center text-xs leading-5 text-[var(--text-faint)]">
        Al crear una cuenta aceptas el uso responsable de la información clínica
        dentro de tu consultorio.
      </p>
    </div>
  );
}
