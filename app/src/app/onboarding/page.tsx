import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { OrganizationForm } from "@/features/organizations/organization-form";
import { requireIdentity } from "@/lib/auth/session";

export const metadata = { title: "Configurar consultorio" };

export default async function OnboardingPage() {
  const context = await requireIdentity();
  if (context.workspace) redirect("/dashboard");

  return (
    <main className="min-h-dvh bg-[var(--canvas)] px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <BrandMark />
        <div className="mt-10 grid overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-white shadow-[0_24px_80px_rgba(29,66,51,0.08)] lg:grid-cols-[0.82fr_1.18fr]">
          <section className="border-b border-[var(--line)] bg-[var(--brand-950)] p-8 text-white lg:border-r lg:border-b-0 lg:p-12">
            <span className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/8 text-[var(--sage-200)]">
              <Icon name="spark" className="size-5" />
            </span>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sage-300)]">
              Paso 1 de 1
            </p>
            <h1 className="mt-4 text-3xl font-medium tracking-[-0.04em]">
              Prepara tu espacio de trabajo
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              El consultorio separa de forma segura tus pacientes, equipo,
              agenda y configuración clínica.
            </p>
          </section>

          <section className="p-7 sm:p-10 lg:p-14">
            <p className="eyebrow">Configuración inicial</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--ink)] sm:text-3xl">
              ¿Cómo se llama tu consultorio?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Este nombre aparecerá en el panel y, más adelante, en tus planes
              nutricionales y documentos.
            </p>
            <OrganizationForm />
          </section>
        </div>
      </div>
    </main>
  );
}
