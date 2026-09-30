import Link from "next/link";

import { Icon } from "@/components/icon";
import { listMealPlans } from "@/features/meal-plans/data";
import { requireWorkspace } from "@/lib/auth/session";

export const metadata = { title: "Planes nutricionales" };
const statusLabels = {
  draft: "Borrador",
  active: "Activo",
  archived: "Archivado",
} as const;

export default async function MealPlansPage() {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant")
    return (
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Información clínica</p>
        <section className="panel mt-5 p-7">
          <h1 className="text-xl font-semibold">
            Planes nutricionales protegidos
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Tu rol de asistente no permite consultar ni modificar planes
            alimentarios.
          </p>
        </section>
      </div>
    );
  const plans = await listMealPlans();
  return (
    <div className="mx-auto max-w-[88rem]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Planificación clínica</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Planes nutricionales
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Construye y conserva las versiones del plan de cada paciente.
          </p>
        </div>
        <Link className="button-primary" href="/planes/nuevo">
          <Icon name="plus" className="size-4" />
          Nuevo plan
        </Link>
      </div>
      <section className="panel mt-7">
        {plans.length ? (
          <div className="divide-y divide-[var(--line)]">
            {plans.map((plan) => (
              <Link
                className="grid gap-2 px-5 py-4 transition hover:bg-[var(--surface-muted)] sm:grid-cols-[1fr_12rem_8rem_1.5rem] sm:items-center sm:px-6"
                href={`/planes/${plan.id}`}
                key={plan.id}
              >
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">
                    {plan.patient
                      ? `${plan.patient.first_name} ${plan.patient.last_name}`
                      : "Paciente"}
                  </p>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {plan.target_energy_kcal
                    ? `${plan.target_energy_kcal} kcal`
                    : "Sin objetivo energético"}
                </p>
                <span className="w-fit rounded-full bg-[var(--brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--brand-700)]">
                  {statusLabels[plan.status]}
                </span>
                <Icon
                  name="chevron"
                  className="hidden size-4 text-[var(--text-faint)] sm:block"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div>
              <Icon
                name="clipboard"
                className="mx-auto size-6 text-[var(--brand-700)]"
              />
              <h2 className="mt-4 font-semibold">Aún no hay planes</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Crea un borrador para comenzar a organizar la alimentación de un
                paciente.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
