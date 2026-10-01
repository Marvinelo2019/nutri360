import Link from "next/link";
import { notFound } from "next/navigation";

import { getMealPlanTemplate } from "@/features/meal-plan-templates/data";
import { UseTemplateForm } from "@/features/meal-plan-templates/template-forms";
import { getMealPlanPatients } from "@/features/meal-plans/data";

export const metadata = { title: "Usar plantilla" };

export default async function UseTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, patients] = await Promise.all([
    getMealPlanTemplate(id),
    getMealPlanPatients(),
  ]);
  if (!record || !record.template.is_active) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href={`/plantillas/${id}`}
      >
        ← Volver a la plantilla
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Nuevo borrador</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Usar {record.template.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Selecciona al paciente. La copia será independiente y podrás editarla
          antes de activarla.
        </p>
      </div>
      {patients.length ? (
        <UseTemplateForm
          defaultName={record.template.name}
          patients={patients}
          templateId={id}
        />
      ) : (
        <section className="panel p-6 text-center">
          <p className="font-semibold">Primero registra un paciente activo.</p>
        </section>
      )}
    </div>
  );
}
