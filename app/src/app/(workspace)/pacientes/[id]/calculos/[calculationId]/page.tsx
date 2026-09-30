import Link from "next/link";
import { notFound } from "next/navigation";

import { getEnergyCalculation } from "@/features/energy-calculations/data";
import {
  energyFormulaLabels,
  macroMethodLabels,
  type EnergyFormula,
  type MacroMethod,
} from "@/lib/nutrition/energy";

export const metadata = { title: "Resultado nutricional" };

const numberFormat = new Intl.NumberFormat("es-GT", {
  maximumFractionDigits: 1,
});
const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

export default async function EnergyCalculationPage({
  params,
}: {
  params: Promise<{ id: string; calculationId: string }>;
}) {
  const { id, calculationId } = await params;
  const record = await getEnergyCalculation(id, calculationId);
  if (!record || !record.patient) notFound();
  const calculation = record.calculation;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href={`/pacientes/${id}`}
      >
        ← Volver al expediente
      </Link>
      <header className="mt-5 flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Resultado estimado</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            {record.patient.first_name} {record.patient.last_name}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {dateFormat.format(new Date(calculation.created_at))} ·{" "}
            {energyFormulaLabels[calculation.formula as EnergyFormula]}
          </p>
        </div>
        <Link
          className="button-primary"
          href={`/planes/nuevo?calculationId=${calculation.id}`}
        >
          Crear plan con estos objetivos
        </Link>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Gasto en reposo", calculation.resting_energy_kcal],
          ["Gasto con actividad", calculation.total_energy_kcal],
          ["Objetivo energético", calculation.target_energy_kcal],
        ].map(([label, value]) => (
          <div className="metric-card" key={String(label)}>
            <p className="text-xs text-[var(--text-faint)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold">
              {numberFormat.format(Number(value))} kcal
            </p>
          </div>
        ))}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <section className="panel p-5 sm:p-6">
          <h2 className="text-base font-semibold">Entradas conservadas</h2>
          <dl className="mt-5 grid grid-cols-2 gap-5 text-sm">
            <div>
              <dt className="text-xs text-[var(--text-faint)]">Peso</dt>
              <dd className="mt-1 font-medium">
                {calculation.weight_kg_snapshot} kg
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-faint)]">Talla</dt>
              <dd className="mt-1 font-medium">
                {calculation.height_cm_snapshot} cm
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-faint)]">Edad</dt>
              <dd className="mt-1 font-medium">
                {calculation.age_years_snapshot} años
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-faint)]">Actividad</dt>
              <dd className="mt-1 font-medium">
                × {calculation.activity_factor}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-faint)]">Ajuste</dt>
              <dd className="mt-1 font-medium">
                {calculation.goal_adjustment_kcal > 0 ? "+" : ""}
                {calculation.goal_adjustment_kcal} kcal
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-faint)]">Versión</dt>
              <dd className="mt-1 break-words font-medium">
                {calculation.formula_version}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-base font-semibold">
            Objetivos de macronutrientes
          </h2>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {macroMethodLabels[calculation.macro_method as MacroMethod]} ·
            equivalencia energética {calculation.macro_energy_kcal} kcal
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ["Proteína", calculation.target_protein_g],
              ["Carbohidratos", calculation.target_carbohydrate_g],
              ["Grasas", calculation.target_fat_g],
            ].map(([label, value]) => (
              <div
                className="rounded-xl bg-[var(--surface-muted)] p-4"
                key={String(label)}
              >
                <p className="text-xs text-[var(--text-faint)]">{label}</p>
                <p className="mt-2 text-xl font-semibold">
                  {numberFormat.format(Number(value))} g
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
        Resultado predictivo para apoyo profesional; no sustituye calorimetría
        indirecta ni valoración clínica individual.
      </div>
    </div>
  );
}
