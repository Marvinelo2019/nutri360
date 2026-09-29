"use server";

import { redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  createOrganizationSlug,
  organizationSchema,
  type OrganizationFormState,
} from "./schemas";

export async function createOrganizationAction(
  _previousState: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const parsed = organizationSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const context = await getCurrentContext();
  if (!context) redirect("/login");
  if (context.workspace) redirect("/dashboard");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_organization", {
    organization_name: parsed.data.name,
    organization_slug: createOrganizationSlug(parsed.data.name, context.userId),
  });

  if (error) {
    return {
      status: "error",
      message:
        "No pudimos crear el consultorio. Inténtalo nuevamente en un momento.",
    };
  }

  redirect("/dashboard");
}
