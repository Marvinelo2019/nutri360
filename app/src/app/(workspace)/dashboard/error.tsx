"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl">
      <section className="panel p-6 text-center" role="alert">
        <h1 className="text-lg font-semibold">No pudimos cargar el resumen</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Intenta nuevamente. Ningún registro fue modificado.
        </p>
        <button className="button-primary mt-5" onClick={reset}>
          Reintentar
        </button>
      </section>
    </div>
  );
}
