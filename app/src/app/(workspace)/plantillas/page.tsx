import Link from "next/link";

import { Icon } from "@/components/icon";
import { listMealPlanTemplates } from "@/features/meal-plan-templates/data";
import { requireWorkspace } from "@/lib/auth/session";

export const metadata = { title: "Plantillas de planes" };

export default async function TemplatesPage() {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant") {
    return (
      <section className="panel mx-auto max-w-3xl p-7">
        <h1 className="text-xl font-semibold">Acceso clínico requerido</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Las plantillas contienen información de planificación nutricional.
        </p>
      </section>
    );
  }
  const templates = await listMealPlanTemplates();
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/planes"
      >
        ← Volver a planes
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Biblioteca clínica</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Plantillas de planes
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Reutiliza estructuras revisadas sin copiar información del paciente
          original.
        </p>
      </div>
      <section className="panel">
        {templates.length ? (
          <div className="divide-y divide-[var(--line)]">
            {templates.map((template) => (
              <Link
                className="flex items-center justify-between gap-4 px-5 py-5 transition hover:bg-[var(--surface-muted)] sm:px-6"
                href={`/plantillas/${template.id}`}
                key={template.id}
              >
                <div>
                  <p className="font-semibold">{template.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {template.category || "Sin categoría"} ·{" "}
                    {template.target_energy_kcal
                      ? `${template.target_energy_kcal} kcal`
                      : "Sin objetivo energético"}
                  </p>
                  {template.description && (
                    <p className="mt-2 text-sm text-[var(--text-faint)]">
                      {template.description}
                    </p>
                  )}
                </div>
                <Icon
                  name="chevron"
                  className="size-4 shrink-0 text-[var(--text-faint)]"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div className="max-w-sm">
              <Icon
                name="clipboard"
                className="mx-auto size-6 text-[var(--brand-700)]"
              />
              <h2 className="mt-4 font-semibold">Aún no hay plantillas</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Abre un plan con alimentos y selecciona “Guardar como
                plantilla”.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
