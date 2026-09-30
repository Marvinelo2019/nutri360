import Link from "next/link";

import { listFoodGroups } from "@/features/food-groups/data";
import { requireWorkspace } from "@/lib/auth/session";

export const metadata = { title: "Grupos y equivalentes" };

export default async function FoodGroupsPage() {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist") {
    return (
      <section className="panel mx-auto max-w-3xl p-7">
        <h1 className="text-xl font-semibold">Acceso clínico requerido</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Los asistentes no pueden consultar la configuración nutricional.
        </p>
      </section>
    );
  }
  const groups = await listFoodGroups();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Configuración nutricional</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Grupos y equivalentes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Define los valores que utiliza tu clínica. Este catálogo todavía no
            representa una tabla alimentaria regional validada.
          </p>
        </div>
        <Link className="button-primary" href="/equivalentes/nuevo">
          Nuevo grupo
        </Link>
      </header>

      <section className="mt-6 rounded-2xl border border-[var(--brand-100)] bg-[var(--brand-50)] p-5">
        <h2 className="text-sm font-semibold text-[var(--brand-950)]">
          ¿Qué es un equivalente?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Es una porción estándar definida por la nutricionista. Por ejemplo, un
          equivalente del grupo “Cereales” puede representar alimentos con
          aportes similares. La nutricionista configura una vez los nutrientes
          del grupo y luego indica cuántos equivalentes incluye cada alimento
          del plan.
        </p>
      </section>

      {groups.length ? (
        <section className="panel mt-5 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs text-[var(--text-faint)]">
              <tr>
                <th className="px-6 py-3 font-medium">Grupo</th>
                <th className="px-4 py-3 font-medium">Energía</th>
                <th className="px-4 py-3 font-medium">Proteína</th>
                <th className="px-4 py-3 font-medium">Carbohidratos</th>
                <th className="px-4 py-3 font-medium">Grasas</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {groups.map((group) => (
                <tr key={group.id}>
                  <td className="px-6 py-4">
                    <Link
                      className="font-semibold text-[var(--brand-700)] hover:underline"
                      href={`/equivalentes/${group.id}`}
                    >
                      {group.name}
                    </Link>
                    <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
                      {group.portion_guidance || "Sin guía de porción"}
                    </p>
                  </td>
                  <td className="px-4 py-4">{group.energy_kcal} kcal</td>
                  <td className="px-4 py-4">{group.protein_g} g</td>
                  <td className="px-4 py-4">{group.carbohydrate_g} g</td>
                  <td className="px-4 py-4">{group.fat_g} g</td>
                  <td className="px-4 py-4">
                    <span
                      className={
                        group.is_active
                          ? "text-[var(--success)]"
                          : "text-[var(--text-faint)]"
                      }
                    >
                      {group.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="panel mt-6 px-6 py-12 text-center">
          <h2 className="font-semibold">Aún no hay grupos configurados</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
            Crea el primer grupo con los valores por equivalente que utiliza tu
            clínica.
          </p>
          <Link className="button-primary mt-5" href="/equivalentes/nuevo">
            Crear primer grupo
          </Link>
        </section>
      )}
    </div>
  );
}
