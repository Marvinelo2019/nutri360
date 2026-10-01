"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getMealPlan } from "@/features/meal-plans/data";
import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  PdfLayoutError,
  buildMealPlanPdf,
  type MealPlanPdfInput,
} from "./pdf-renderer";

export type PdfGenerationState = {
  status: "idle" | "error";
  message?: string;
};

function objectTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export async function generateMealPlanPdfAction(
  _state: PdfGenerationState,
  formData: FormData,
): Promise<PdfGenerationState> {
  const parsed = z.uuid().safeParse(formData.get("planId"));
  if (!parsed.success)
    return { status: "error", message: "El plan seleccionado no es válido." };
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return { status: "error", message: "Esta acción requiere acceso clínico." };

  const record = await getMealPlan(parsed.data);
  if (!record) return { status: "error", message: "No encontramos el plan." };
  if (record.plan.status === "draft")
    return {
      status: "error",
      message: "Activa el plan antes de generar el documento final.",
    };
  if (!record.patient)
    return { status: "error", message: "No encontramos al paciente del plan." };

  const supabase = await createServerSupabaseClient();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name, brand_color, phone_e164, logo_path")
    .eq("id", workspace.id)
    .maybeSingle();
  if (organizationError || !organization)
    return {
      status: "error",
      message: "No pudimos cargar la marca del consultorio.",
    };

  let logoBytes: Uint8Array | undefined;
  let logoMime: "image/png" | "image/jpeg" | undefined;
  if (organization.logo_path) {
    const { data: logo } = await supabase.storage
      .from("organization-assets")
      .download(organization.logo_path);
    if (logo) {
      logoBytes = new Uint8Array(await logo.arrayBuffer());
      logoMime = organization.logo_path.endsWith(".png")
        ? "image/png"
        : "image/jpeg";
    }
  }

  const input: MealPlanPdfInput = {
    organization: {
      name: organization.name,
      brandColor: organization.brand_color,
      phone: organization.phone_e164,
      logoBytes,
      logoMime,
    },
    patientName: `${record.patient.first_name} ${record.patient.last_name}`,
    plan: {
      name: record.plan.name,
      startsOn: record.plan.starts_on,
      endsOn: record.plan.ends_on,
      targetEnergyKcal: record.plan.target_energy_kcal,
      targetProteinG: record.plan.target_protein_g,
      targetCarbohydrateG: record.plan.target_carbohydrate_g,
      targetFatG: record.plan.target_fat_g,
      instructions: record.plan.instructions,
    },
    meals: record.meals.map((meal) => ({
      name: meal.name,
      suggestedTime: meal.suggested_time,
      items: meal.items.map((item) => ({
        foodName: item.food_name,
        quantity: item.quantity,
        unit: item.unit,
        guidance: item.guidance,
      })),
    })),
  };

  let bytes: Uint8Array;
  try {
    bytes = await buildMealPlanPdf(input);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof PdfLayoutError
          ? error.message
          : "No pudimos componer el documento.",
    };
  }

  const objectPath = `${workspace.id}/${record.plan.id}/meal-plan-${objectTimestamp()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("meal-plan-pdfs")
    .upload(objectPath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError)
    return { status: "error", message: "No pudimos guardar el PDF privado." };

  const { error: registerError } = await supabase.rpc(
    "register_meal_plan_pdf",
    {
      target_plan_id: record.plan.id,
      object_path: objectPath,
    },
  );
  if (registerError) {
    await supabase.storage.from("meal-plan-pdfs").remove([objectPath]);
    return {
      status: "error",
      message: "No pudimos registrar el PDF generado.",
    };
  }
  revalidatePath(`/planes/${record.plan.id}`);
  redirect(`/planes/${record.plan.id}/pdf`);
}
