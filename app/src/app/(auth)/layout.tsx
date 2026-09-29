import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-dvh bg-[var(--canvas)] lg:grid-cols-[minmax(0,1.02fr)_minmax(30rem,0.98fr)]">
      <section className="relative hidden overflow-hidden border-r border-[var(--line)] bg-[var(--brand-950)] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="auth-grid" aria-hidden="true" />
        <div className="relative z-10">
          <BrandMark inverse />
        </div>

        <div className="relative z-10 max-w-xl pb-10">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--sage-300)]">
            Gestión nutricional integral
          </p>
          <h1 className="max-w-lg text-[clamp(2.5rem,4vw,4.4rem)] font-medium leading-[1.03] tracking-[-0.055em]">
            Tu práctica clínica, clara y bien organizada.
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[var(--sage-100)]/75">
            Expedientes, consulta, planes nutricionales y seguimiento dentro de
            un espacio privado para tu consultorio.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-white/55">
          <span className="h-px w-8 bg-white/25" />
          Diseñado para profesionales de nutrición
        </div>
      </section>

      <section className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="lg:hidden">
          <BrandMark />
        </div>
        <div className="mx-auto flex w-full max-w-[29rem] flex-1 items-center py-10">
          {children}
        </div>
        <p className="text-center text-xs text-[var(--text-faint)]">
          Nutri360 · Información protegida por consultorio
        </p>
      </section>
    </main>
  );
}
