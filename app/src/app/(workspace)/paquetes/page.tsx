import Link from "next/link";

import { Icon } from "@/components/icon";
import { setPackageActiveAction } from "@/features/packages/actions";
import { getPackagesOverview } from "@/features/packages/data";
import { PackageDefinitionForm } from "@/features/packages/package-forms";
import { patientPackageStateLabels } from "@/features/packages/presentation";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Paquetes" };

const dateFormat = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeZone: "America/Guatemala",
});

export default async function PackagesPage() {
  const { definitions, purchases } = await getPackagesOverview();
  const availableSessions = purchases
    .filter((purchase) => purchase.displayState === "active")
    .reduce((total, purchase) => total + purchase.remainingSessions, 0);
  return (
    <div className="mx-auto max-w-[88rem]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Control administrativo</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
            Paquetes y sesiones
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Vende paquetes y concilia cada sesión con una cita completada.
          </p>
        </div>
        <Link className="button-primary" href="/paquetes/vender">
          <Icon name="plus" className="size-4" />
          Vender paquete
        </Link>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Paquetes activos</p>
          <p className="mt-4 text-2xl font-semibold">
            {purchases.filter((item) => item.displayState === "active").length}
          </p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">
            Sesiones disponibles
          </p>
          <p className="mt-4 text-2xl font-semibold">{availableSessions}</p>
        </article>
        <article className="metric-card">
          <p className="text-sm text-[var(--text-muted)]">Vendidos</p>
          <p className="mt-4 text-2xl font-semibold">{purchases.length}</p>
        </article>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Paquetes de pacientes</h2>
                <p className="panel-description">
                  El saldo se deriva del historial de movimientos.
                </p>
              </div>
            </div>
            {purchases.length ? (
              <div className="divide-y divide-[var(--line)]">
                {purchases.map((purchase) => (
                  <Link
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-[var(--surface-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    href={`/paquetes/${purchase.id}`}
                    key={purchase.id}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {purchase.patient
                          ? `${purchase.patient.first_name} ${purchase.patient.last_name}`
                          : "Paciente"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {purchase.package_name_snapshot} · vence{" "}
                        {dateFormat.format(
                          new Date(`${purchase.expires_on}T12:00:00`),
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="text-sm font-semibold text-[var(--brand-700)]">
                        {purchase.remainingSessions}/{purchase.total_sessions}{" "}
                        sesiones
                      </span>
                      <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold">
                        {patientPackageStateLabels[purchase.displayState]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid min-h-56 place-items-center px-6 text-center">
                <div>
                  <Icon
                    name="payments"
                    className="mx-auto size-6 text-[var(--brand-700)]"
                  />
                  <h3 className="mt-4 font-semibold">
                    Aún no hay paquetes vendidos
                  </h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Crea una opción en el catálogo y véndela a un paciente.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Catálogo</h2>
                <p className="panel-description">
                  Las ventas conservan una copia de estas condiciones.
                </p>
              </div>
            </div>
            {definitions.length ? (
              <div className="divide-y divide-[var(--line)]">
                {definitions.map((definition) => (
                  <div
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    key={definition.id}
                  >
                    <div>
                      <p className="text-sm font-semibold">{definition.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {definition.session_count} sesiones ·{" "}
                        {definition.validity_days} días ·{" "}
                        {formatCurrency(definition.price_centavos)}
                      </p>
                    </div>
                    <form
                      action={setPackageActiveAction.bind(
                        null,
                        definition.id,
                        !definition.is_active,
                      )}
                    >
                      <button
                        className={
                          definition.is_active
                            ? "text-xs font-semibold text-[var(--danger)] hover:underline"
                            : "text-xs font-semibold text-[var(--brand-700)] hover:underline"
                        }
                      >
                        {definition.is_active ? "Archivar" : "Reactivar"}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-6 py-9 text-center text-sm text-[var(--text-muted)]">
                Crea el primer paquete desde el formulario.
              </p>
            )}
          </section>
        </div>
        <aside>
          <PackageDefinitionForm />
        </aside>
      </div>
    </div>
  );
}
