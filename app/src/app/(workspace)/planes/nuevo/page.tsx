import Link from "next/link";

import { getEnergyCalculationForMealPlan } from "@/features/energy-calculations/data";
import { getMealPlanPatients } from "@/features/meal-plans/data";
import { MealPlanForm } from "@/features/meal-plans/meal-plan-form";
import { requireWorkspace } from "@/lib/auth/session";

export const metadata = { title: "Nuevo plan nutricional" };

export default async function NewMealPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ calculationId?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant") {
    return (
      <section className="panel mx-auto max-w-3xl p-7">
        <h1 className="text-xl font-semibold">Acceso clínico requerido</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Los asistentes no pueden crear planes nutricionales.
        </p>
      </section>
    );
  }
  const { calculationId } = await searchParams;
  const [patients, calculation] = await Promise.all([
    getMealPlanPatients(),
    calculationId
      ? getEnergyCalculationForMealPlan(calculationId)
      : Promise.resolve(null),
  ]);
  const initialValues = calculation
    ? {
        patientId: calculation.patient_id,
        name: "Plan basado en cálculo nutricional",
        energyKcal: String(calculation.target_energy_kcal),
        proteinG: String(calculation.target_protein_g),
        carbohydrateG: String(calculation.target_carbohydrate_g),
        fatG: String(calculation.target_fat_g),
      }
    : undefined;
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/planes"
      >
        ← Volver a planes
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Nuevo borrador</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Crear plan nutricional
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Define los objetivos y después completa los cinco tiempos de comida.
        </p>
      </div>
      {patients.length ? (
        <MealPlanForm patients={patients} initialValues={initialValues} />
      ) : (
        <section className="panel p-6 text-center">
          <h2 className="font-semibold">Primero registra un paciente</h2>
          <Link className="button-primary mt-5" href="/pacientes/nuevo">
            Registrar paciente
          </Link>
        </section>
      )}
    </div>
  );
}
