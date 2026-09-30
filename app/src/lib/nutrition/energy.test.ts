import { describe, expect, it } from "vitest";

import {
  calculateEnergy,
  calculateMacros,
  calculateRestingEnergyKcal,
  type EnergyFormula,
} from "./energy";

const male = {
  sex: "male" as const,
  ageYears: 35,
  weightKg: 70,
  heightCm: 175,
};
const female = {
  sex: "female" as const,
  ageYears: 35,
  weightKg: 60,
  heightCm: 165,
};

describe("adult resting energy equations", () => {
  it.each<[EnergyFormula, number, number]>([
    ["mifflin_st_jeor", 1625.85, 1297.45],
    ["harris_benedict_revised", 1667.282, 1362.033],
    ["fao_who_unu", 1720, 1345.75],
  ])(
    "calculates %s from its versioned coefficients",
    (formula, maleExpected, femaleExpected) => {
      expect(calculateRestingEnergyKcal({ ...male, formula })).toBeCloseTo(
        maleExpected,
        3,
      );
      expect(calculateRestingEnergyKcal({ ...female, formula })).toBeCloseTo(
        femaleExpected,
        3,
      );
    },
  );

  it("applies activity and goal adjustments after resting energy", () => {
    expect(
      calculateEnergy({
        ...male,
        formula: "mifflin_st_jeor",
        activityFactor: 1.55,
        goalAdjustmentKcal: -500,
      }),
    ).toEqual({
      restingEnergyKcal: 1626,
      totalEnergyKcal: 2520,
      targetEnergyKcal: 2020,
    });
  });
});

describe("macronutrient distributions", () => {
  it("converts energy percentages to grams", () => {
    expect(
      calculateMacros(2020, 70, {
        method: "percentage",
        protein: 30,
        carbohydrate: 40,
        fat: 30,
      }),
    ).toEqual({
      proteinG: 151.5,
      carbohydrateG: 202,
      fatG: 67.3,
      macroEnergyKcal: 2020,
    });
  });

  it("converts grams per kilogram using the measurement snapshot", () => {
    expect(
      calculateMacros(2020, 70, {
        method: "grams_per_kg",
        protein: 1.8,
        carbohydrate: 3,
        fat: 0.8,
      }),
    ).toEqual({
      proteinG: 126,
      carbohydrateG: 210,
      fatG: 56,
      macroEnergyKcal: 1848,
    });
  });
});
