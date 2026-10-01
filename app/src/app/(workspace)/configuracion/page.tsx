import { BrandingForm } from "@/features/organizations/branding-form";
import { getOrganizationBranding } from "@/features/organizations/branding-data";
import { requireWorkspace } from "@/lib/auth/session";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const [{ workspace }, branding] = await Promise.all([
    requireWorkspace(),
    getOrganizationBranding(),
  ]);
  if (!branding) return null;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7">
        <p className="eyebrow">Consultorio</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
          Identidad visual
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Esta información aparecerá en los planes alimenticios entregados a
          pacientes.
        </p>
      </div>
      {workspace.role === "owner" ? (
        <BrandingForm
          brandColor={branding.brand_color}
          hasLogo={Boolean(branding.logo_path)}
          name={branding.name}
          phone={branding.phone_e164 ?? ""}
        />
      ) : (
        <section className="panel p-6">
          <p className="font-semibold">
            Configuración administrada por el propietario
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            La marca actual es {branding.name}.
          </p>
        </section>
      )}
    </div>
  );
}
