import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import type { Database } from "@/types/database";

import { BrandMark } from "./brand-mark";
import { Icon, type IconName } from "./icon";

const navigation: Array<{ label: string; icon: IconName; href?: string }> = [
  { label: "Inicio", icon: "dashboard", href: "/dashboard" },
  { label: "Agenda", icon: "calendar" },
  { label: "Pacientes", icon: "patients" },
  { label: "Planes", icon: "clipboard" },
  { label: "Pagos", icon: "payments" },
  { label: "Configuración", icon: "settings" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

type AppShellProps = {
  children: React.ReactNode;
  clinicName: string;
  fullName: string;
  role: Database["public"]["Enums"]["app_role"];
};

const roleLabels: Record<Database["public"]["Enums"]["app_role"], string> = {
  owner: "Propietario",
  nutritionist: "Nutricionista",
  assistant: "Asistente",
  patient: "Paciente",
};

export function AppShell({
  children,
  clinicName,
  fullName,
  role,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-[var(--ink)] lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[16.5rem] flex-col border-r border-[var(--line)] bg-white lg:flex">
        <div className="px-7 pt-7">
          <BrandMark href="/dashboard" />
        </div>

        <div className="mx-4 mt-8 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-3.5 py-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Consultorio
          </p>
          <p className="mt-1.5 truncate text-sm font-semibold text-[var(--ink)]">
            {clinicName}
          </p>
        </div>

        <nav className="mt-6 flex-1 px-4" aria-label="Navegación principal">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="nav-item nav-item-active"
                    aria-current="page"
                  >
                    <Icon name={item.icon} className="size-[1.1rem]" />
                    {item.label}
                  </Link>
                ) : (
                  <span className="nav-item cursor-default text-[var(--text-muted)]">
                    <Icon name={item.icon} className="size-[1.1rem]" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[0.58rem] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                      Pronto
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[var(--line)] p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-100)] text-xs font-bold text-[var(--brand-700)]">
              {initials(fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-[var(--text-faint)]">
                {roleLabels[role]}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="icon-button"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <Icon name="logout" className="size-[1.1rem]" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-[4.5rem] items-center justify-between border-b border-[var(--line)] bg-white/92 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="lg:hidden">
            <BrandMark compact href="/dashboard" />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs text-[var(--text-faint)]">Espacio clínico</p>
            <p className="mt-0.5 text-sm font-semibold">{clinicName}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-[var(--text-faint)]">
                {roleLabels[role]}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-full border border-[var(--line-strong)] bg-white text-xs font-bold text-[var(--brand-700)]">
              {initials(fullName)}
            </span>
          </div>
        </header>

        <main className="px-5 py-7 pb-24 sm:px-8 lg:px-10 lg:py-9 lg:pb-10">
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
          aria-label="Navegación móvil"
        >
          <ul className="grid grid-cols-4">
            {navigation.slice(0, 4).map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    className="mobile-nav mobile-nav-active"
                    href={item.href}
                  >
                    <Icon name={item.icon} className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="mobile-nav text-[var(--text-faint)]">
                    <Icon name={item.icon} className="size-5" />
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
