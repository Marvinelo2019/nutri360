import Link from "next/link";
import { notFound } from "next/navigation";

import { changeMealPlanStatusAction } from "@/features/meal-plans/actions";
import { getMealPlan } from "@/features/meal-plans/data";
import { MealItemForm } from "@/features/meal-plans/meal-item-form";
import { MealItemRow } from "@/features/meal-plans/meal-item-row";
import { calculateEquivalentTotals } from "@/lib/nutrition/equivalents";

export const metadata = { title: "Detalle del plan" };
const statusLabels = {
  draft: "Borrador",
  active: "Activo",
  archived: "Archivado",
} as const;

export default async function MealPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getMealPlan(id);
  if (!record) notFound();
  const editable = record.plan.status === "draft";
  const canChangeStatus = record.plan.status !== "archived";
  const itemCount = record.meals.reduce(
    (total, meal) => total + meal.items.length,
    0,
  );
  const estimated = calculateEquivalentTotals(
    record.meals.flatMap((meal) => meal.items),
  );
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/planes"
      >
        ← Volver a planes
      </Link>
      <header className="mt-5 flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            Plan de{" "}
            {record.patient
              ? `${record.patient.first_name} ${record.patient.last_name}`
              : "paciente"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            {record.plan.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {statusLabels[record.plan.status]}
          </p>
        </div>
        {canChangeStatus && (
          <div className="flex gap-2">
            {record.plan.status === "draft" && (
              <form
                action={changeMealPlanStatusAction.bind(null, id, "active")}
              >
                <button className="button-primary" disabled={itemCount === 0}>
                  Activar plan
                </button>
              </form>
            )}
            <form
              action={changeMealPlanStatusAction.bind(null, id, "archived")}
            >
              <button className="button-secondary">Archivar</button>
            </form>
          </div>
        )}
      </header>
      {record.plan.status === "draft" && itemCount === 0 && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Agrega al menos un alimento antes de activar el plan.
        </p>
      )}
      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <article className="metric-card">
          <p className="text-xs text-[var(--text-faint)]">Energía</p>
          <p className="mt-2 text-xl font-semibold">
            {record.plan.target_energy_kcal ?? "—"}
            <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
              kcal
            </span>
          </p>
        </article>
        <article className="metric-card">
          <p className="text-xs text-[var(--text-faint)]">Proteína</p>
          <p className="mt-2 text-xl font-semibold">
            {record.plan.target_protein_g ?? "—"}
            <span className="ml-1 text-xs font-normal">g</span>
          </p>
        </article>
        <article className="metric-card">
          <p className="text-xs text-[var(--text-faint)]">Carbohidratos</p>
          <p className="mt-2 text-xl font-semibold">
            {record.plan.target_carbohydrate_g ?? "—"}
            <span className="ml-1 text-xs font-normal">g</span>
          </p>
        </article>
        <article className="metric-card">
          <p className="text-xs text-[var(--text-faint)]">Grasas</p>
          <p className="mt-2 text-xl font-semibold">
            {record.plan.target_fat_g ?? "—"}
            <span className="ml-1 text-xs font-normal">g</span>
          </p>
        </article>
      </section>
      <section className="panel mt-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Estimado por equivalentes</h2>
            <p className="mt-1 text-xs text-[var(--text-faint)]">
              Suma basada únicamente en alimentos asociados a un grupo
              configurado.
            </p>
          </div>
          <Link
            className="text-xs font-semibold text-[var(--brand-700)] hover:underline"
            href="/equivalentes"
          >
            Configurar grupos
          </Link>
        </div>
        {estimated.itemCount ? (
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Energía", `${Math.round(estimated.energy)} kcal`],
              ["Proteína", `${estimated.protein.toFixed(1)} g`],
              ["Carbohidratos", `${estimated.carbohydrate.toFixed(1)} g`],
              ["Grasas", `${estimated.fat.toFixed(1)} g`],
            ].map(([label, value]) => (
              <div
                className="rounded-xl bg-[var(--surface-muted)] p-4"
                key={label}
              >
                <dt className="text-xs text-[var(--text-faint)]">{label}</dt>
                <dd className="mt-2 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            Aún no hay alimentos con equivalentes asignados.
          </p>
        )}
      </section>
      {record.plan.instructions && (
        <section className="panel mt-5 p-5">
          <h2 className="text-sm font-semibold">Indicaciones generales</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
            {record.plan.instructions}
          </p>
        </section>
      )}
      <div className="mt-5 space-y-4">
        {record.meals.map((meal) => (
          <section className="panel p-5 sm:p-6" key={meal.id}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{meal.name}</h2>
              <span className="text-xs text-[var(--text-faint)]">
                {meal.suggested_time?.slice(0, 5)}
              </span>
            </div>
            {meal.items.length ? (
              <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {meal.items.map((item) => (
                  <MealItemRow
                    editable={editable}
                    foodGroups={record.foodGroups}
                    item={item}
                    key={item.id}
                    planId={id}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-faint)]">
                Sin alimentos agregados.
              </p>
            )}
            {editable && (
              <MealItemForm
                foodGroups={record.foodGroups}
                mealId={meal.id}
                planId={id}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
