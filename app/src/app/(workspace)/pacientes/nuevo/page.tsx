import Link from "next/link";

import { PatientForm } from "@/features/patients/patient-form";
import { requireWorkspace } from "@/lib/auth/session";

export const metadata = { title: "Nuevo paciente" };

export default async function NewPatientPage() {
  const { workspace } = await requireWorkspace();
  const canEditClinical =
    workspace.role === "owner" || workspace.role === "nutritionist";
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/pacientes"
      >
        ← Volver a pacientes
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Nuevo expediente</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Registrar paciente
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Crea el expediente administrativo y documenta el consentimiento.
        </p>
      </div>
      <PatientForm canEditClinical={canEditClinical} />
    </div>
  );
}
