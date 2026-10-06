import Link from "next/link";
import { notFound } from "next/navigation";

import {
  cancelPatientPackageAction,
  reversePackageSessionAction,
} from "@/features/packages/actions";
import { getPatientPackage } from "@/features/packages/data";
import { ConsumeSessionForm } from "@/features/packages/package-forms";
import { patientPackageStateLabels } from "@/features/packages/presentation";
import {
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/features/payments/presentation";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Detalle del paquete" };

const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeZone: "America/Guatemala",
});
const dateTimeFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

export default async function PatientPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getPatientPackage(id);
  if (!record) notFound();
  const canConsume =
    record.displayState === "active" && record.remainingSessions > 0;
  return (
    <div className="mx-auto max-w-[88rem]">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/paquetes"
      >
        ← Volver a paquetes
      </Link>
      <header className="mt-5 flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Paquete del paciente</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            {record.patientPackage.package_name_snapshot}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {record.patient.first_name} {record.patient.last_name}
          </p>
        </div>
        <span className="w-fit rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold">
          {patientPackageStateLabels[record.displayState]}
        </span>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">
            Sesiones disponibles
          </p>
          <p className="mt-4 text-2xl font-semibold">
            {record.remainingSessions}/{record.patientPackage.total_sessions}
          </p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Precio de compra</p>
          <p className="mt-4 text-2xl font-semibold">
            {formatCurrency(record.patientPackage.price_centavos)}
          </p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Vencimiento</p>
          <p className="mt-4 text-lg font-semibold">
            {dateFormat.format(
              new Date(`${record.patientPackage.expires_on}T12:00:00`),
            )}
          </p>
        </article>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Historial de sesiones</h2>
              <p className="panel-description">
                Los movimientos no se eliminan; las correcciones se revierten.
              </p>
            </div>
          </div>
          {record.usages.length ? (
            <div className="divide-y divide-[var(--line)]">
              {record.usages.map((usage) => (
                <div
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  key={usage.id}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {usage.kind === "reversal"
                        ? "Reversión de sesión"
                        : usage.isReversed
                          ? "Sesión revertida"
                          : "Sesión consumida"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {usage.appointment
                        ? dateTimeFormat.format(
                            new Date(usage.appointment.starts_at),
                          )
                        : dateTimeFormat.format(new Date(usage.created_at))}
                    </p>
                  </div>
                  {usage.kind === "consumption" && !usage.isReversed && (
                    <form
                      action={reversePackageSessionAction.bind(
                        null,
                        record.patientPackage.id,
                        usage.id,
                      )}
                    >
                      <button className="text-xs font-semibold text-[var(--danger)] hover:underline">
                        Revertir
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
              Todavía no se ha consumido ninguna sesión.
            </p>
          )}
        </section>

        <aside className="space-y-5">
          {canConsume ? (
            <ConsumeSessionForm
              patientPackageId={record.patientPackage.id}
              appointments={record.eligibleAppointments}
            />
          ) : (
            <section className="panel p-5">
              <h2 className="font-semibold">Consumo no disponible</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Este paquete está{" "}
                {patientPackageStateLabels[record.displayState].toLowerCase()} y
                no admite nuevos consumos.
              </p>
            </section>
          )}
          <section className="panel p-5">
            <h2 className="font-semibold">Pago asociado</h2>
            {record.payment ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-muted)]">Estado</dt>
                  <dd className="font-semibold">
                    {paymentStatusLabels[record.payment.status]}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-muted)]">Método</dt>
                  <dd className="font-semibold">
                    {paymentMethodLabels[record.payment.method]}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-muted)]">Monto</dt>
                  <dd className="font-semibold">
                    {formatCurrency(record.payment.amount_centavos)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Esta venta no creó un pago.
              </p>
            )}
          </section>
          {record.patientPackage.status === "active" && (
            <form action={cancelPatientPackageAction.bind(null, id)}>
              <button className="button-secondary w-full text-[var(--danger)]">
                Cancelar paquete
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
