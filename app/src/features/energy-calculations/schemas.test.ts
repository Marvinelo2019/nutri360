import { describe, expect, it } from "vitest";

import { energyCalculationSchema } from "./schemas";

const base = {
  patientId: "10000000-0000-4000-8000-000000000001",
  measurementId: "10000000-0000-4000-8000-000000000002",
  formula: "mifflin_st_jeor",
  activityFactor: "1.55",
  goalAdjustmentKcal: "-300",
  macroMethod: "percentage",
  proteinInput: "20",
  carbohydrateInput: "50",
  fatInput: "30",
};

describe("energyCalculationSchema", () => {
  it("accepts a percentage distribution totaling 100", () => {
    expect(energyCalculationSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a percentage distribution that does not total 100", () => {
    const result = energyCalculationSchema.safeParse({
      ...base,
      fatInput: "20",
    });
    expect(result.success).toBe(false);
  });

  it("validates grams-per-kilogram bounds", () => {
    expect(
      energyCalculationSchema.safeParse({
        ...base,
        macroMethod: "grams_per_kg",
        proteinInput: "1.8",
        carbohydrateInput: "3",
        fatInput: "0.8",
      }).success,
    ).toBe(true);
    expect(
      energyCalculationSchema.safeParse({
        ...base,
        macroMethod: "grams_per_kg",
        proteinInput: "11",
      }).success,
    ).toBe(false);
  });
});
