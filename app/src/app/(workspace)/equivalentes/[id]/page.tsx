import Link from "next/link";
import { notFound } from "next/navigation";

import { getFoodGroup } from "@/features/food-groups/data";
import { FoodGroupForm } from "@/features/food-groups/food-group-form";

export const metadata = { title: "Editar grupo de equivalentes" };

export default async function EditFoodGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = await getFoodGroup(id);
  if (!group) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/equivalentes"
      >
        ← Volver a equivalentes
      </Link>
      <header className="mb-7 mt-5">
        <p className="eyebrow">Editar grupo</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          {group.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Los cambios aplican a nuevas asignaciones; los planes existentes
          conservan su copia histórica.
        </p>
      </header>
      <FoodGroupForm group={group} />
    </div>
  );
}
