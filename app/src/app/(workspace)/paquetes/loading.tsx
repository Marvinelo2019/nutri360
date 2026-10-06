export default function PackagesLoading() {
  return (
    <div
      className="mx-auto max-w-[88rem]"
      aria-busy="true"
      aria-label="Cargando paquetes"
    >
      <div className="h-8 w-52 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            className="h-28 animate-pulse rounded-2xl bg-[var(--surface-muted)]"
            key={item}
          />
        ))}
      </div>
      <div className="mt-5 h-80 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
    </div>
  );
}
