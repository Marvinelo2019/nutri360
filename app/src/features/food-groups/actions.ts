"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  foodGroupSchema,
  type FoodGroupFormState,
  type FoodGroupFormValues,
} from "./schemas";

function readValues(formData: FormData): FoodGroupFormValues {
  const value = (field: string) => String(formData.get(field) ?? "");
  return {
    name: value("name"),
    description: value("description"),
    portionGuidance: value("portionGuidance"),
    energyKcal: value("energyKcal"),
    proteinG: value("proteinG"),
    carbohydrateG: value("carbohydrateG"),
    fatG: value("fatG"),
    sortOrder: value("sortOrder"),
    isActive: formData.get("isActive") === "on",
  };
}

function parseValues(values: FoodGroupFormValues) {
  return foodGroupSchema.safeParse(values);
}

function failure(
  state: FoodGroupFormState,
  values: FoodGroupFormValues,
  errors?: Record<string, string[]>,
  message = "Revisa los campos indicados.",
): FoodGroupFormState {
  return {
    status: "error",
    message,
    errors,
    values,
    attempt: (state.attempt ?? 0) + 1,
  };
}

export async function createFoodGroupAction(
  state: FoodGroupFormState,
  formData: FormData,
): Promise<FoodGroupFormState> {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist") {
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  }
  const values = readValues(formData);
  values.isActive = true;
  const parsed = parseValues(values);
  if (!parsed.success)
    return failure(state, values, parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_food_group", {
    target_organization_id: workspace.id,
    group_name: parsed.data.name,
    group_description: parsed.data.description || null,
    group_portion_guidance: parsed.data.portionGuidance || null,
    group_energy_kcal: parsed.data.energyKcal,
    group_protein_g: parsed.data.proteinG,
    group_carbohydrate_g: parsed.data.carbohydrateG,
    group_fat_g: parsed.data.fatG,
    group_sort_order: parsed.data.sortOrder,
  });
  if (error) {
    return failure(
      state,
      values,
      undefined,
      error.code === "23505"
        ? "Ya existe un grupo con ese nombre."
        : "No pudimos crear el grupo.",
    );
  }
  revalidatePath("/equivalentes");
  redirect("/equivalentes");
}

export async function updateFoodGroupAction(
  groupId: string,
  state: FoodGroupFormState,
  formData: FormData,
): Promise<FoodGroupFormState> {
  const { workspace } = await requireWorkspace();
  if (
    (workspace.role !== "owner" && workspace.role !== "nutritionist") ||
    !z.uuid().safeParse(groupId).success
  ) {
    return { status: "error", message: "Esta acción requiere acceso clínico." };
  }
  const values = readValues(formData);
  const parsed = parseValues(values);
  if (!parsed.success)
    return failure(state, values, parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_food_group", {
    target_group_id: groupId,
    group_name: parsed.data.name,
    group_description: parsed.data.description || null,
    group_portion_guidance: parsed.data.portionGuidance || null,
    group_energy_kcal: parsed.data.energyKcal,
    group_protein_g: parsed.data.proteinG,
    group_carbohydrate_g: parsed.data.carbohydrateG,
    group_fat_g: parsed.data.fatG,
    group_sort_order: parsed.data.sortOrder,
    group_is_active: parsed.data.isActive,
  });
  if (error) {
    return failure(
      state,
      values,
      undefined,
      error.code === "23505"
        ? "Ya existe un grupo con ese nombre."
        : "No pudimos actualizar el grupo.",
    );
  }
  revalidatePath("/equivalentes");
  revalidatePath(`/equivalentes/${groupId}`);
  revalidatePath("/planes");
  return {
    status: "success",
    message: "Grupo actualizado.",
    values,
    attempt: (state.attempt ?? 0) + 1,
  };
}
