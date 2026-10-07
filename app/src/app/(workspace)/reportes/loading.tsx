export default function ReportsLoading() {
  return (
    <div
      className="mx-auto max-w-[88rem]"
      aria-busy="true"
      aria-label="Cargando reporte mensual"
    >
      <div className="h-8 w-52 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            className="h-32 animate-pulse rounded-2xl bg-[var(--surface-muted)]"
            key={item}
          />
        ))}
      </div>
      <div className="mt-5 h-72 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
    </div>
  );
}
