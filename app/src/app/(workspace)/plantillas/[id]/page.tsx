import Link from "next/link";
import { notFound } from "next/navigation";

import { archiveMealPlanTemplateAction } from "@/features/meal-plan-templates/actions";
import { getMealPlanTemplate } from "@/features/meal-plan-templates/data";

export const metadata = { title: "Detalle de plantilla" };

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getMealPlanTemplate(id);
  if (!record) notFound();
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/plantillas"
      >
        ← Volver a plantillas
      </Link>
      <header className="mt-5 flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            {record.template.category || "Plantilla nutricional"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            {record.template.name}
          </h1>
          {record.template.description && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {record.template.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {record.template.is_active && (
            <Link className="button-primary" href={`/plantillas/${id}/usar`}>
              Usar plantilla
            </Link>
          )}
          {record.template.is_active && (
            <form action={archiveMealPlanTemplateAction.bind(null, id)}>
              <button className="button-secondary text-[var(--danger)]">
                Archivar
              </button>
            </form>
          )}
        </div>
      </header>
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [
            "Energía",
            record.template.target_energy_kcal
              ? `${record.template.target_energy_kcal} kcal`
              : "—",
          ],
          [
            "Proteína",
            record.template.target_protein_g
              ? `${record.template.target_protein_g} g`
              : "—",
          ],
          [
            "Carbohidratos",
            record.template.target_carbohydrate_g
              ? `${record.template.target_carbohydrate_g} g`
              : "—",
          ],
          [
            "Grasas",
            record.template.target_fat_g
              ? `${record.template.target_fat_g} g`
              : "—",
          ],
        ].map(([label, value]) => (
          <article className="metric-card" key={label}>
            <p className="text-xs text-[var(--text-faint)]">{label}</p>
            <p className="mt-2 font-semibold">{value}</p>
          </article>
        ))}
      </section>
      {record.template.instructions && (
        <section className="panel mt-5 p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Indicaciones generales</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
            {record.template.instructions}
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
                  <li className="py-3 text-sm" key={item.id}>
                    <span className="font-semibold">
                      {item.quantity} {item.unit} · {item.food_name}
                    </span>
                    {item.food_group_name_snapshot && (
                      <span className="ml-2 text-xs text-[var(--brand-700)]">
                        {item.equivalent_count} eq. de{" "}
                        {item.food_group_name_snapshot}
                      </span>
                    )}
                    {item.guidance && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {item.guidance}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-faint)]">
                Sin alimentos.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
