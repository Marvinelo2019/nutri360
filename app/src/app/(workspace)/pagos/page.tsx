import Link from "next/link";

import { Icon } from "@/components/icon";
import { changePaymentStatusAction } from "@/features/payments/actions";
import { getMonthlyPayments } from "@/features/payments/data";
import {
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/features/payments/presentation";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Pagos" };
const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeZone: "America/Guatemala",
});

export default async function PaymentsPage() {
  const payments = await getMonthlyPayments();
  const paid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.amount_centavos, 0);
  const pending = payments
    .filter((payment) => payment.status === "pending")
    .reduce((total, payment) => total + payment.amount_centavos, 0);
  return (
    <div className="mx-auto max-w-[88rem]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Control administrativo</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Pagos
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Movimientos del mes actual registrados por paciente.
          </p>
        </div>
        <Link className="button-primary" href="/pagos/nuevo">
          <Icon name="plus" className="size-4" />
          Registrar pago
        </Link>
      </div>
      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Ingresos pagados</p>
          <p className="mt-4 text-2xl font-semibold">{formatCurrency(paid)}</p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Saldo pendiente</p>
          <p className="mt-4 text-2xl font-semibold">
            {formatCurrency(pending)}
          </p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Movimientos</p>
          <p className="mt-4 text-2xl font-semibold">{payments.length}</p>
        </article>
      </section>
      <section className="panel mt-5">
        {payments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs text-[var(--text-faint)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Monto</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 font-medium">
                      {payment.patient
                        ? `${payment.patient.first_name} ${payment.patient.last_name}`
                        : "Paciente"}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-muted)]">
                      {dateFormat.format(
                        new Date(payment.paid_at ?? payment.created_at),
                      )}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-muted)]">
                      {payment.packageName ?? "Consulta"}
                    </td>
                    <td className="px-4 py-4">
                      {paymentMethodLabels[payment.method]}
                    </td>
                    <td className="px-4 py-4">
                      {paymentStatusLabels[payment.status]}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold">
                      {formatCurrency(payment.amount_centavos)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {payment.status === "pending" && (
                          <>
                            <form
                              action={changePaymentStatusAction.bind(
                                null,
                                payment.id,
                                "paid",
                              )}
                            >
                              <button className="text-xs font-semibold text-[var(--brand-700)] hover:underline">
                                Marcar pagado
                              </button>
                            </form>
                            <form
                              action={changePaymentStatusAction.bind(
                                null,
                                payment.id,
                                "voided",
                              )}
                            >
                              <button className="text-xs font-semibold text-[var(--danger)] hover:underline">
                                Anular
                              </button>
                            </form>
                          </>
                        )}
                        {payment.status === "paid" && (
                          <form
                            action={changePaymentStatusAction.bind(
                              null,
                              payment.id,
                              "refunded",
                            )}
                          >
                            <button className="text-xs font-semibold text-[var(--danger)] hover:underline">
                              Reembolsar
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div>
              <Icon
                name="payments"
                className="mx-auto size-6 text-[var(--brand-700)]"
              />
              <h2 className="mt-4 font-semibold">Sin movimientos este mes</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Los pagos registrados aparecerán aquí.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
