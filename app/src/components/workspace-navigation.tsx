"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "./icon";

const navigation: Array<{ label: string; icon: IconName; href?: string }> = [
  { label: "Inicio", icon: "dashboard", href: "/dashboard" },
  { label: "Agenda", icon: "calendar", href: "/agenda" },
  { label: "Pacientes", icon: "patients", href: "/pacientes" },
  { label: "Planes", icon: "clipboard", href: "/planes" },
  { label: "Equivalentes", icon: "spark", href: "/equivalentes" },
  { label: "Paquetes", icon: "payments", href: "/paquetes" },
  { label: "Pagos", icon: "payments", href: "/pagos" },
  { label: "Reportes", icon: "dashboard", href: "/reportes" },
  { label: "Configuración", icon: "settings", href: "/configuracion" },
];

export function WorkspaceNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const items = mobile ? navigation.slice(0, 4) : navigation;
  return (
    <ul className={mobile ? "grid grid-cols-4" : "space-y-1"}>
      {items.map((item) => {
        const active =
          item.href &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <li key={item.label}>
            {item.href ? (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  mobile
                    ? `mobile-nav ${active ? "mobile-nav-active" : "text-[var(--text-muted)]"}`
                    : `nav-item ${active ? "nav-item-active" : "text-[var(--text-muted)]"}`
                }
              >
                <Icon
                  name={item.icon}
                  className={mobile ? "size-5" : "size-[1.1rem]"}
                />
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  mobile
                    ? "mobile-nav text-[var(--text-faint)]"
                    : "nav-item cursor-default text-[var(--text-muted)]"
                }
              >
                <Icon
                  name={item.icon}
                  className={mobile ? "size-5" : "size-[1.1rem]"}
                />
                <span className={mobile ? "" : "flex-1"}>{item.label}</span>
                {!mobile && (
                  <span className="text-[0.58rem] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                    Pronto
                  </span>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
