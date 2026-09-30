import Link from "next/link";
import { notFound } from "next/navigation";

import { EnergyCalculationForm } from "@/features/energy-calculations/energy-calculation-form";
import { getEnergyCalculationContext } from "@/features/energy-calculations/data";

export const metadata = { title: "Nuevo cálculo nutricional" };

export default async function NewEnergyCalculationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getEnergyCalculationContext(id);
  if (!context) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href={`/pacientes/${id}`}
      >
        ← Volver al expediente
      </Link>
      <header className="mb-7 mt-5">
        <p className="eyebrow">Cálculo nutricional</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Requerimiento de {context.patient.first_name}{" "}
          {context.patient.last_name}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Estima energía y macronutrientes a partir de una medición adulta
          guardada.
        </p>
      </header>

      {!context.patient.growth_reference_sex ? (
        <section className="panel p-6">
          <h2 className="font-semibold">Falta el sexo de referencia</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Las fórmulas disponibles requieren este dato. Actualiza el perfil
            del paciente antes de calcular.
          </p>
        </section>
      ) : !context.measurements.length ? (
        <section className="panel p-6">
          <h2 className="font-semibold">Primero registra una medición</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Se necesita peso y talla para crear un cálculo reproducible.
          </p>
        </section>
      ) : (
        <EnergyCalculationForm
          patientId={id}
          measurements={context.measurements}
        />
      )}
    </div>
  );
}
