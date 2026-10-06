import Link from "next/link";

import { getPackageSaleOptions } from "@/features/packages/data";
import { SellPackageForm } from "@/features/packages/package-forms";
import { clinicDateKey } from "@/lib/format";

export const metadata = { title: "Vender paquete" };

export default async function SellPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string }>;
}) {
  const [{ packages, patients }, query] = await Promise.all([
    getPackageSaleOptions(),
    searchParams,
  ]);
  const defaultPatientId = patients.some(
    (patient) => patient.id === query.paciente,
  )
    ? query.paciente
    : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/paquetes"
      >
        ← Volver a paquetes
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Nueva venta</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Vender paquete
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Las condiciones quedan congeladas en la compra del paciente.
        </p>
      </div>
      {!packages.length ? (
        <section className="panel p-6 text-center">
          <h2 className="font-semibold">Primero crea un paquete</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Necesitas una opción activa en el catálogo.
          </p>
          <Link className="button-primary mt-5" href="/paquetes">
            Ir al catálogo
          </Link>
        </section>
      ) : !patients.length ? (
        <section className="panel p-6 text-center">
          <h2 className="font-semibold">Primero registra un paciente</h2>
          <Link className="button-primary mt-5" href="/pacientes/nuevo">
            Registrar paciente
          </Link>
        </section>
      ) : (
        <SellPackageForm
          packages={packages}
          patients={patients}
          defaultDate={clinicDateKey()}
          defaultPatientId={defaultPatientId}
        />
      )}
    </div>
  );
}
