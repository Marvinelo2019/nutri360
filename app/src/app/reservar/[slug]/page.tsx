import type { CSSProperties } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { getPublicBookingPageData } from "@/features/public-booking/data";
import { PublicBookingForm } from "@/features/public-booking/public-booking-form";
import { presentPublicBookingSlots } from "@/features/public-booking/presentation";

export const metadata = {
  title: "Reservar cita",
  description: "Solicita una cita de nutrición.",
};

function UnavailableBooking() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="panel max-w-md p-7 text-center">
        <BrandMark />
        <h1 className="mt-7 text-xl font-semibold">Reservas no disponibles</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Este enlace no está disponible en este momento. Solicita a la clínica
          un enlace actualizado o inténtalo más tarde.
        </p>
      </section>
    </main>
  );
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ desde?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const record = await getPublicBookingPageData(slug, query.desde);
  if (!record) return <UnavailableBooking />;

  const style = {
    "--public-brand": record.context.brand_color,
  } as CSSProperties;
  const presentedSlots = presentPublicBookingSlots(
    record.slots,
    record.context.clinic_timezone,
  );

  return (
    <main
      className="min-h-screen bg-[var(--canvas)] px-4 py-6 sm:px-6 sm:py-10"
      style={style}
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-7 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
          <div className="h-1.5 bg-[var(--public-brand)]" />
          <div className="p-5 sm:p-7">
            <BrandMark />
            <p className="eyebrow mt-7">Reserva en línea</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
              {record.context.organization_name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Selecciona un espacio disponible y envía tu solicitud. La clínica
              se comunicará contigo para confirmarla.
            </p>
            {record.context.public_instructions && (
              <p className="mt-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--text-muted)]">
                {record.context.public_instructions}
              </p>
            )}
            {record.context.contact_phone && (
              <a
                className="mt-4 inline-block text-sm font-semibold text-[var(--brand-700)] hover:underline"
                href={`tel:${record.context.contact_phone}`}
              >
                Contactar a la clínica
              </a>
            )}
          </div>
        </header>

        {presentedSlots.length ? (
          <PublicBookingForm
            clinicName={record.context.organization_name}
            consentVersion={record.context.privacy_consent_version}
            slug={slug}
            slots={presentedSlots}
          />
        ) : (
          <section className="panel p-7 text-center">
            <h2 className="font-semibold">No hay horarios en este período</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Puedes revisar las siguientes fechas o comunicarte directamente
              con la clínica.
            </p>
          </section>
        )}

        <nav
          className="mt-5 flex items-center justify-between gap-3"
          aria-label="Períodos disponibles"
        >
          {record.previousStart ? (
            <Link
              className="button-secondary min-h-11"
              href={`/reservar/${slug}?desde=${record.previousStart}`}
            >
              ← Fechas anteriores
            </Link>
          ) : (
            <span />
          )}
          {record.nextStart && (
            <Link
              className="button-secondary min-h-11"
              href={`/reservar/${slug}?desde=${record.nextStart}`}
            >
              Siguientes fechas →
            </Link>
          )}
        </nav>
        <p className="mt-8 text-center text-xs text-[var(--text-faint)]">
          Reserva segura gestionada con Nutri360
        </p>
      </div>
    </main>
  );
}
