import Link from "next/link";
import { notFound } from "next/navigation";

import { ConsultationCreateForm } from "@/features/consultations/consultation-create-form";
import { getPatient } from "@/features/patients/data";
import { clinicDateKey } from "@/lib/format";

export const metadata = { title: "Nueva consulta" };

export default async function NewConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getPatient(id);
  if (!record || !record.canViewClinical) notFound();
  const now = new Date();
  const defaultTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Guatemala",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href={`/pacientes/${id}`}
      >
        ← Volver al expediente
      </Link>
      <header className="mt-5 border-b border-[var(--line)] pb-6">
        <p className="eyebrow">Consulta clínica</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Abrir consulta
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {record.patient.first_name} {record.patient.last_name} · Se abrirá
          como consulta en curso.
        </p>
      </header>
      <div className="mt-6">
        <ConsultationCreateForm
          defaultDate={clinicDateKey(now)}
          defaultTime={defaultTime}
          patientId={id}
        />
      </div>
    </div>
  );
}
