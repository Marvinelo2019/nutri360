"use client";

export default function ReportsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl">
      <section className="panel p-6 text-center" role="alert">
        <h1 className="text-lg font-semibold">No pudimos cargar el reporte</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Intenta nuevamente. No se modificó ningún registro.
        </p>
        <button className="button-primary mt-5" onClick={reset}>
          Reintentar
        </button>
      </section>
    </div>
  );
}
