"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  saveTemplateSchema,
  useTemplateSchema,
  type TemplateFormState,
} from "./schemas";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function isClinician(role: string) {
  return role === "owner" || role === "nutritionist";
}

export async function saveMealPlanAsTemplateAction(
  _state: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const { workspace } = await requireWorkspace();
  if (!isClinician(workspace.role))
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  const parsed = saveTemplateSchema.safeParse({
    category: value(formData, "category"),
    description: value(formData, "description"),
    name: value(formData, "name"),
    planId: value(formData, "planId"),
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "create_meal_plan_template_from_plan",
    {
      target_plan_id: parsed.data.planId,
      template_category: parsed.data.category || null,
      template_description: parsed.data.description || null,
      template_name: parsed.data.name,
    },
  );
  if (error || !data)
    return {
      status: "error",
      message: error?.message.includes("duplicate")
        ? "Ya existe una plantilla activa con ese nombre."
        : "No pudimos guardar la plantilla.",
    };
  revalidatePath("/plantillas");
  redirect(`/plantillas/${data}`);
}

export async function createPlanFromTemplateAction(
  _state: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const { workspace } = await requireWorkspace();
  if (!isClinician(workspace.role))
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  const parsed = useTemplateSchema.safeParse({
    endsOn: value(formData, "endsOn"),
    name: value(formData, "name"),
    patientId: value(formData, "patientId"),
    startsOn: value(formData, "startsOn"),
    templateId: value(formData, "templateId"),
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_meal_plan_from_template", {
    plan_ends_on: parsed.data.endsOn || null,
    plan_name: parsed.data.name,
    plan_starts_on: parsed.data.startsOn || null,
    target_patient_id: parsed.data.patientId,
    target_template_id: parsed.data.templateId,
  });
  if (error || !data)
    return { status: "error", message: "No pudimos crear el plan." };
  revalidatePath("/planes");
  redirect(`/planes/${data}`);
}

export async function archiveMealPlanTemplateAction(templateId: string) {
  const { workspace } = await requireWorkspace();
  if (!isClinician(workspace.role) || !z.uuid().safeParse(templateId).success)
    return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("archive_meal_plan_template", {
    target_template_id: templateId,
  });
  if (!error) {
    revalidatePath("/plantillas");
    redirect("/plantillas");
  }
}
