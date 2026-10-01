import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listMealPlanTemplates() {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant" || workspace.role === "patient") return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("meal_plan_templates")
    .select("*")
    .eq("organization_id", workspace.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMealPlanTemplate(templateId: string) {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant" || workspace.role === "patient")
    return null;
  const supabase = await createServerSupabaseClient();
  const { data: template, error: templateError } = await supabase
    .from("meal_plan_templates")
    .select("*")
    .eq("id", templateId)
    .eq("organization_id", workspace.id)
    .maybeSingle();
  if (templateError) throw templateError;
  if (!template) return null;
  const [mealsResult, itemsResult] = await Promise.all([
    supabase
      .from("meal_plan_template_meals")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order"),
    supabase
      .from("meal_plan_template_items")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order"),
  ]);
  if (mealsResult.error) throw mealsResult.error;
  if (itemsResult.error) throw itemsResult.error;
  const { error: auditError } = await supabase.rpc(
    "record_meal_plan_template_read",
    {
      target_template_id: templateId,
    },
  );
  if (auditError) throw auditError;
  const meals = mealsResult.data;
  const items = itemsResult.data;
  return {
    template,
    meals: (meals ?? []).map((meal) => ({
      ...meal,
      items: (items ?? []).filter((item) => item.template_meal_id === meal.id),
    })),
  };
}
