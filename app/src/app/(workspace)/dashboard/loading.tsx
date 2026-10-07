export default function DashboardLoading() {
  return (
    <div
      className="mx-auto max-w-[88rem]"
      aria-busy="true"
      aria-label="Cargando resumen del consultorio"
    >
      <div className="h-8 w-64 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            className="h-32 animate-pulse rounded-2xl bg-[var(--surface-muted)]"
            key={index}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="h-96 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
        <div className="h-72 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}
