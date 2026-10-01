"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { brandingSchema, type BrandingFormState } from "./branding-schemas";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const allowedLogoTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
]);

export async function updateBrandingAction(
  _state: BrandingFormState,
  formData: FormData,
): Promise<BrandingFormState> {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner")
    return {
      status: "error",
      message: "Solo el propietario puede cambiar la marca.",
    };

  const parsed = brandingSchema.safeParse({
    name: formData.get("name"),
    brandColor: formData.get("brandColor"),
    phoneE164: formData.get("phoneE164"),
    removeLogo: formData.get("removeLogo") === "on",
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > MAX_LOGO_BYTES)
    return { status: "error", message: "El logo no puede superar 2 MB." };
  if (logo instanceof File && logo.size > 0 && !allowedLogoTypes.has(logo.type))
    return { status: "error", message: "El logo debe ser PNG o JPEG." };

  const supabase = await createServerSupabaseClient();
  const { data: current, error: currentError } = await supabase
    .from("organizations")
    .select("logo_path")
    .eq("id", workspace.id)
    .maybeSingle();
  if (currentError || !current)
    return { status: "error", message: "No pudimos cargar la marca actual." };

  let logoPath = parsed.data.removeLogo ? null : current.logo_path;
  if (logo instanceof File && logo.size > 0) {
    const extension = allowedLogoTypes.get(logo.type)!;
    logoPath = `${workspace.id}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("organization-assets")
      .upload(logoPath, await logo.arrayBuffer(), {
        contentType: logo.type,
        upsert: true,
      });
    if (uploadError)
      return { status: "error", message: "No pudimos guardar el logo." };
  }

  const { error } = await supabase.rpc("update_organization_branding", {
    target_organization_id: workspace.id,
    organization_name: parsed.data.name,
    organization_brand_color: parsed.data.brandColor,
    organization_phone_e164: parsed.data.phoneE164 || null,
    organization_logo_path: logoPath,
  });
  if (error)
    return { status: "error", message: "No pudimos actualizar la marca." };

  if (current.logo_path && current.logo_path !== logoPath) {
    await supabase.storage
      .from("organization-assets")
      .remove([current.logo_path]);
  }
  revalidatePath("/", "layout");
  revalidatePath("/configuracion");
  return { status: "success", message: "Marca actualizada." };
}
