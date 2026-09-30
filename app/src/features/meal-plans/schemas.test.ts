import { describe, expect, it } from "vitest";

import { mealItemSchema, mealPlanSchema } from "./schemas";

describe("meal plan schemas", () => {
  it("keeps optional targets empty instead of coercing them to zero", () => {
    const result = mealPlanSchema.parse({
      patientId: crypto.randomUUID(),
      name: "Plan",
      startsOn: "",
      endsOn: "",
      energyKcal: "",
      proteinG: "",
      carbohydrateG: "",
      fatG: "",
      instructions: "",
    });
    expect(result.energyKcal).toBeUndefined();
  });

  it("rejects an inverted validity range", () => {
    expect(
      mealPlanSchema.safeParse({
        patientId: crypto.randomUUID(),
        name: "Plan",
        startsOn: "2026-10-10",
        endsOn: "2026-10-01",
      }).success,
    ).toBe(false);
  });

  it("requires a positive meal item quantity", () => {
    expect(
      mealItemSchema.safeParse({
        mealId: crypto.randomUUID(),
        planId: crypto.randomUUID(),
        foodName: "Avena",
        quantity: 0,
        unit: "taza",
      }).success,
    ).toBe(false);
  });

  it("requires group and equivalent count together", () => {
    expect(
      mealItemSchema.safeParse({
        mealId: crypto.randomUUID(),
        planId: crypto.randomUUID(),
        foodName: "Avena",
        quantity: 0.5,
        unit: "taza",
        foodGroupId: crypto.randomUUID(),
        equivalentCount: "",
      }).success,
    ).toBe(false);
  });
});
