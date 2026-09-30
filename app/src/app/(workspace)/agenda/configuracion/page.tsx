import Link from "next/link";
import { redirect } from "next/navigation";

import {
  deleteAvailabilityBlockAction,
  deleteAvailabilityRuleAction,
} from "@/features/public-booking/actions";
import {
  AvailabilityBlockForm,
  AvailabilityRuleForm,
  BookingSettingsForm,
  CopyBookingLink,
} from "@/features/public-booking/configuration-forms";
import {
  getPublicBookingConfiguration,
  weekdayLabels,
} from "@/features/public-booking/data";

export const metadata = { title: "Reservas públicas" };

function localDateTime(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guatemala",
  }).format(new Date(value));
}

export default async function BookingConfigurationPage() {
  const record = await getPublicBookingConfiguration();
  if (record.workspace.role === "assistant") redirect("/agenda");
  const names = new Map(
    record.professionals.map((professional) => [
      professional.user_id,
      professional.full_name,
    ]),
  );
  const publicPath = `/reservar/${record.workspace.slug}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        className="text-sm font-semibold text-[var(--brand-700)] hover:underline"
        href="/agenda"
      >
        ← Volver a la agenda
      </Link>
      <div className="mb-7 mt-5">
        <p className="eyebrow">Agenda clínica</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Reservas públicas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Define cuándo puede reservar un paciente. Cada solicitud aparecerá
          como pendiente hasta que el equipo la confirme.
        </p>
      </div>

      <div className="space-y-6">
        <section className="panel p-5 sm:p-6">
          <p className="eyebrow">Enlace para compartir</p>
          <h2 className="mt-2 text-lg font-semibold">
            Enlace de {record.workspace.name}
          </h2>
          <p className="mb-4 mt-1 text-sm text-[var(--text-muted)]">
            Puedes copiarlo y enviarlo por WhatsApp, redes sociales o correo.
          </p>
          <CopyBookingLink path={publicPath} />
          <Link
            className="mt-3 inline-block text-sm font-semibold text-[var(--brand-700)] hover:underline"
            href={publicPath}
            target="_blank"
          >
            Abrir vista pública ↗
          </Link>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mb-5">
            <p className="eyebrow">Reglas generales</p>
            <h2 className="mt-2 text-lg font-semibold">
              Configuración del enlace
            </h2>
          </div>
          <BookingSettingsForm settings={record.settings} />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel p-5 sm:p-6">
            <p className="eyebrow">Disponibilidad recurrente</p>
            <h2 className="mb-5 mt-2 text-lg font-semibold">
              Horarios semanales
            </h2>
            <AvailabilityRuleForm professionals={record.professionals} />
            <div className="mt-6 divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {record.rules.length ? (
                record.rules.map((rule) => (
                  <div
                    className="flex items-center justify-between gap-3 py-3"
                    key={rule.id}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {weekdayLabels[rule.day_of_week]} ·{" "}
                        {rule.starts_at_local.slice(0, 5)}–
                        {rule.ends_at_local.slice(0, 5)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {names.get(rule.professional_user_id) ?? "Profesional"}
                      </p>
                    </div>
                    <form
                      action={deleteAvailabilityRuleAction.bind(null, rule.id)}
                    >
                      <button className="button-secondary text-[var(--danger)]">
                        Quitar
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="py-5 text-sm text-[var(--text-muted)]">
                  Aún no hay horarios. El enlace no mostrará espacios hasta que
                  agregues uno.
                </p>
              )}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <p className="eyebrow">Excepciones</p>
            <h2 className="mb-5 mt-2 text-lg font-semibold">
              Bloqueos de agenda
            </h2>
            <AvailabilityBlockForm professionals={record.professionals} />
            <div className="mt-6 divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {record.blocks.length ? (
                record.blocks.map((block) => (
                  <div
                    className="flex items-center justify-between gap-3 py-3"
                    key={block.id}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {block.label || "Horario no disponible"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                        {names.get(block.professional_user_id) ?? "Profesional"}
                        <br />
                        {localDateTime(block.starts_at)} –{" "}
                        {localDateTime(block.ends_at)}
                      </p>
                    </div>
                    <form
                      action={deleteAvailabilityBlockAction.bind(
                        null,
                        block.id,
                      )}
                    >
                      <button className="button-secondary text-[var(--danger)]">
                        Quitar
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="py-5 text-sm text-[var(--text-muted)]">
                  No hay bloqueos futuros.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
