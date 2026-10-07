import type { CSSProperties } from "react";

import { BrandMark } from "@/components/brand-mark";
import { getPublicIntakeData } from "@/features/intake/data";
import { PublicIntakeForm } from "@/features/intake/public-intake-form";

export const metadata = {
  title: "Preconsulta nutricional",
  description: "Completa información para preparar tu consulta nutricional.",
};

function UnavailableIntake() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="panel max-w-md p-7 text-center">
        <BrandMark />
        <h1 className="mt-7 text-xl font-semibold">
          Preconsulta no disponible
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Este enlace venció, ya fue utilizado o fue revocado. Solicita uno
          nuevo a la clínica.
        </p>
      </section>
    </main>
  );
}

export default async function PublicIntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const context = await getPublicIntakeData(token);
  if (!context) return <UnavailableIntake />;
  const style = { "--public-brand": context.brand_color } as CSSProperties;

  return (
    <main
      className="min-h-screen bg-[var(--canvas)] px-4 py-6 sm:px-6 sm:py-10"
      style={style}
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-7 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
          <div className="h-1.5 bg-[var(--public-brand)]" />
          <div className="p-5 sm:p-7">
            <BrandMark />
            <p className="eyebrow mt-7">Preconsulta nutricional</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
              {context.organization_name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Comparte tus antecedentes y hábitos para que el profesional pueda
              preparar mejor tu consulta.
            </p>
            {context.contact_phone && (
              <a
                className="mt-4 inline-block text-sm font-semibold text-[var(--brand-700)] hover:underline"
                href={`tel:${context.contact_phone}`}
              >
                Contactar a la clínica
              </a>
            )}
          </div>
        </header>
        <PublicIntakeForm
          clinicName={context.organization_name}
          consentVersion={context.consent_version}
          token={token}
        />
        <p className="mt-8 text-center text-xs text-[var(--text-faint)]">
          Preconsulta segura gestionada con Nutri360
        </p>
      </div>
    </main>
  );
}
