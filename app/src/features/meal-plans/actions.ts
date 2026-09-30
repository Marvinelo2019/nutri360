"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  mealItemSchema,
  mealItemUpdateSchema,
  mealPlanSchema,
  type MealItemFormState,
  type MealPlanFormState,
} from "./schemas";

function hasClinicalRole(role: Database["public"]["Enums"]["app_role"]) {
  return role === "owner" || role === "nutritionist";
}

export async function createMealPlanAction(
  state: MealPlanFormState,
  formData: FormData,
): Promise<MealPlanFormState> {
  const { workspace } = await requireWorkspace();
  if (!hasClinicalRole(workspace.role))
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  const value = (field: string) => String(formData.get(field) ?? "");
  const values = {
    patientId: value("patientId"),
    name: value("name"),
    startsOn: value("startsOn"),
    endsOn: value("endsOn"),
    energyKcal: value("energyKcal"),
    proteinG: value("proteinG"),
    carbohydrateG: value("carbohydrateG"),
    fatG: value("fatG"),
    instructions: value("instructions"),
  };
  const attempt = (state.attempt ?? 0) + 1;
  const parsed = mealPlanSchema.safeParse(values);
  if (!parsed.success)
    return {
      status: "error",
      message: "Revisa los campos indicados antes de guardar el plan.",
      errors: parsed.error.flatten().fieldErrors,
      values,
      attempt,
    };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_meal_plan", {
    target_patient_id: parsed.data.patientId,
    plan_name: parsed.data.name,
    plan_starts_on: parsed.data.startsOn || null,
    plan_ends_on: parsed.data.endsOn || null,
    energy_kcal: parsed.data.energyKcal ?? null,
    protein_g: parsed.data.proteinG ?? null,
    carbohydrate_g: parsed.data.carbohydrateG ?? null,
    fat_g: parsed.data.fatG ?? null,
    plan_instructions: parsed.data.instructions || null,
  });
  if (error || !data)
    return {
      status: "error",
      message:
        process.env.NODE_ENV === "development" && error
          ? `No pudimos crear el plan. Detalle local: ${error.message}`
          : "No pudimos crear el plan nutricional.",
      values,
      attempt,
    };
  revalidatePath("/planes");
  redirect(`/planes/${data}`);
}

export async function updateMealItemAction(
  _state: MealItemFormState,
  formData: FormData,
): Promise<MealItemFormState> {
  const { workspace } = await requireWorkspace();
  if (!hasClinicalRole(workspace.role))
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  const parsed = mealItemUpdateSchema.safeParse({
    itemId: formData.get("itemId"),
    planId: formData.get("planId"),
    foodName: formData.get("foodName"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    guidance: formData.get("guidance"),
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_meal_plan_item", {
    target_item_id: parsed.data.itemId,
    item_food_name: parsed.data.foodName,
    item_quantity: parsed.data.quantity,
    item_unit: parsed.data.unit,
    item_guidance: parsed.data.guidance || null,
  });
  if (error)
    return { status: "error", message: "No pudimos actualizar el alimento." };
  revalidatePath(`/planes/${parsed.data.planId}`);
  return { status: "success", message: "Alimento actualizado." };
}

export async function addMealItemAction(
  _state: MealItemFormState,
  formData: FormData,
): Promise<MealItemFormState> {
  const { workspace } = await requireWorkspace();
  if (!hasClinicalRole(workspace.role))
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  const parsed = mealItemSchema.safeParse({
    mealId: formData.get("mealId"),
    planId: formData.get("planId"),
    foodName: formData.get("foodName"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    guidance: formData.get("guidance"),
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("add_meal_plan_item", {
    target_meal_id: parsed.data.mealId,
    item_food_name: parsed.data.foodName,
    item_quantity: parsed.data.quantity,
    item_unit: parsed.data.unit,
    item_guidance: parsed.data.guidance || null,
  });
  if (error)
    return { status: "error", message: "No pudimos agregar el alimento." };
  revalidatePath(`/planes/${parsed.data.planId}`);
  return { status: "success", message: "Alimento agregado." };
}

export async function removeMealItemAction(itemId: string, planId: string) {
  const { workspace } = await requireWorkspace();
  if (!hasClinicalRole(workspace.role)) return;
  if (
    !z.uuid().safeParse(itemId).success ||
    !z.uuid().safeParse(planId).success
  )
    return;
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("remove_meal_plan_item", { target_item_id: itemId });
  revalidatePath(`/planes/${planId}`);
}

export async function changeMealPlanStatusAction(
  planId: string,
  nextStatus: Database["public"]["Enums"]["meal_plan_status"],
) {
  const { workspace } = await requireWorkspace();
  if (
    !hasClinicalRole(workspace.role) ||
    !z.uuid().safeParse(planId).success ||
    !z.enum(["active", "archived"]).safeParse(nextStatus).success
  )
    return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("change_meal_plan_status", {
    target_plan_id: planId,
    next_status: nextStatus,
  });
  if (!error) {
    revalidatePath(`/planes/${planId}`);
    revalidatePath("/planes");
    revalidatePath("/dashboard");
  }
}
