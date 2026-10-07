export default function PublicIntakeLoading() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="panel w-full max-w-md animate-pulse p-7">
        <div className="h-5 w-32 rounded bg-[var(--surface-muted)]" />
        <div className="mt-8 h-8 w-3/4 rounded bg-[var(--surface-muted)]" />
        <div className="mt-4 h-20 rounded bg-[var(--surface-muted)]" />
      </section>
    </main>
  );
}
