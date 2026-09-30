import Link from "next/link";

import { getPaymentPatients } from "@/features/payments/data";
import { PaymentForm } from "@/features/payments/payment-form";
import { clinicDateKey } from "@/lib/format";

export const metadata = { title: "Registrar pago" };

export default async function NewPaymentPage() {
  const patients = await getPaymentPatients();
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/pagos"
      >
        ← Volver a pagos
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Nuevo movimiento</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Registrar pago
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Los montos se guardan con precisión de centavos y quedan auditados.
        </p>
      </div>
      {patients.length ? (
        <PaymentForm patients={patients} defaultDate={clinicDateKey()} />
      ) : (
        <section className="panel p-6 text-center">
          <h2 className="font-semibold">Primero registra un paciente</h2>
          <Link className="button-primary mt-5" href="/pacientes/nuevo">
            Registrar paciente
          </Link>
        </section>
      )}
    </div>
  );
}
