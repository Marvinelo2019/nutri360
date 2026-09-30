import Link from "next/link";

import { FoodGroupForm } from "@/features/food-groups/food-group-form";

export const metadata = { title: "Nuevo grupo de equivalentes" };

export default function NewFoodGroupPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/equivalentes"
      >
        ← Volver a equivalentes
      </Link>
      <header className="mb-7 mt-5">
        <p className="eyebrow">Nuevo grupo</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Configurar equivalente
        </h1>
      </header>
      <FoodGroupForm />
    </div>
  );
}
