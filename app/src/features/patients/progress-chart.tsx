import type { Tables } from "@/types/database";

function Trend({
  values,
  label,
  unit,
}: {
  values: number[];
  label: string;
  unit: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = 16 + (index / (values.length - 1)) * 268;
      const y = 82 - ((value - min) / range) * 58;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold">{label}</h3>
        <span className="text-xs text-[var(--text-muted)]">
          {values.at(-1)} {unit}
        </span>
      </div>
      <svg
        aria-label={`Evolución de ${label.toLowerCase()}`}
        className="h-24 w-full"
        role="img"
        viewBox="0 0 300 96"
      >
        <line stroke="var(--line)" x1="16" x2="284" y1="82" y2="82" />
        <polyline
          fill="none"
          points={points}
          stroke="var(--brand-600)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        {points.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return (
            <circle
              cx={cx}
              cy={cy}
              fill="var(--surface)"
              key={point}
              r="3.5"
              stroke="var(--brand-700)"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
}

export function ProgressChart({
  measurements,
}: {
  measurements: Tables<"anthropometric_measurements">[];
}) {
  const chronological = measurements.slice(0, 8).reverse();
  const waist = chronological
    .filter((m) => m.waist_cm != null)
    .map((m) => m.waist_cm as number);
  if (chronological.length < 2) return null;
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-base font-semibold">Progreso antropométrico</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Hasta las últimas ocho mediciones, en orden cronológico.
      </p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <Trend
          label="Peso"
          unit="kg"
          values={chronological.map((m) => m.weight_kg)}
        />
        {waist.length >= 2 && (
          <Trend label="Cintura" unit="cm" values={waist} />
        )}
      </div>
    </section>
  );
}
