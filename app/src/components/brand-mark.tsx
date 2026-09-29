import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  inverse?: boolean;
};

export function BrandMark({
  compact = false,
  href = "/",
  inverse = false,
}: BrandMarkProps) {
  return (
    <Link
      className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-4"
      href={href}
      aria-label="Nutri360, inicio"
    >
      <span
        className={`grid size-9 place-items-center rounded-[0.7rem] shadow-[0_6px_18px_rgba(36,91,70,0.18)] ${
          inverse
            ? "bg-white text-[var(--brand-950)]"
            : "bg-[var(--brand-700)] text-white"
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none">
          <path
            d="M6.25 17.5c4.8-.12 8.18-2.44 10.18-7.25M7.1 13.1c.52-3.28 2.52-5.47 6.02-6.58 1.57-.5 3.12-.57 4.63-.27-.06 1.64-.46 3.13-1.2 4.47-1.73 3.13-4.48 4.56-8.25 4.28"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span
          className={`text-[1.08rem] font-semibold tracking-[-0.025em] ${inverse ? "text-white" : "text-[var(--ink)]"}`}
        >
          Nutri
          <span
            className={
              inverse ? "text-[var(--sage-300)]" : "text-[var(--brand-600)]"
            }
          >
            360
          </span>
        </span>
      )}
    </Link>
  );
}
