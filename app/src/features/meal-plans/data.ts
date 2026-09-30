import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listMealPlans() {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant" || workspace.role === "patient") return [];
  const supabase = await createServerSupabaseClient();
  const { data: plans, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("organization_id", workspace.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const patientIds = [...new Set(plans.map((plan) => plan.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .in("id", patientIds)
    : { data: [] };
  const names = new Map(
    (patients ?? []).map((patient) => [patient.id, patient]),
  );
  return plans.map((plan) => ({
    ...plan,
    patient: names.get(plan.patient_id) ?? null,
  }));
}

export async function getMealPlan(planId: string) {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant" || workspace.role === "patient")
    return null;
  const supabase = await createServerSupabaseClient();
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", planId)
    .eq("organization_id", workspace.id)
    .maybeSingle();
  if (!plan) return null;
  const [
    { data: patient },
    { data: meals },
    { data: items },
    { data: foodGroups },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("id", plan.patient_id)
      .maybeSingle(),
    supabase
      .from("meal_plan_meals")
      .select("*")
      .eq("meal_plan_id", planId)
      .order("sort_order"),
    supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planId)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("food_groups")
      .select("id, name")
      .eq("organization_id", workspace.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  ]);
  await supabase.rpc("record_meal_plan_read", { target_plan_id: planId });
  return {
    plan,
    patient,
    foodGroups: foodGroups ?? [],
    meals: (meals ?? []).map((meal) => ({
      ...meal,
      items: (items ?? []).filter((item) => item.meal_id === meal.id),
    })),
  };
}

export async function getMealPlanPatients() {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant" || workspace.role === "patient") return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .eq("organization_id", workspace.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("first_name");
  if (error) throw error;
  return data;
}

export async function getActiveMealPlanCount() {
  const { workspace } = await requireWorkspace();
  if (workspace.role === "assistant" || workspace.role === "patient") return 0;
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("meal_plans")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", workspace.id)
    .eq("status", "active");
  return count ?? 0;
}
