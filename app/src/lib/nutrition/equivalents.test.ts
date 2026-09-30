import { describe, expect, it } from "vitest";

import { calculateEquivalentTotals } from "./equivalents";

describe("calculateEquivalentTotals", () => {
  it("sums count multiplied by each immutable nutrient snapshot", () => {
    expect(
      calculateEquivalentTotals([
        {
          equivalent_count: 2,
          equivalent_energy_kcal: 70,
          equivalent_protein_g: 3,
          equivalent_carbohydrate_g: 15,
          equivalent_fat_g: 0,
        },
        {
          equivalent_count: 1.5,
          equivalent_energy_kcal: 100,
          equivalent_protein_g: 5,
          equivalent_carbohydrate_g: 10,
          equivalent_fat_g: 4,
        },
      ]),
    ).toEqual({
      itemCount: 2,
      energy: 290,
      protein: 13.5,
      carbohydrate: 45,
      fat: 6,
    });
  });

  it("ignores items without a complete equivalent snapshot", () => {
    expect(
      calculateEquivalentTotals([
        {
          equivalent_count: null,
          equivalent_energy_kcal: null,
          equivalent_protein_g: null,
          equivalent_carbohydrate_g: null,
          equivalent_fat_g: null,
        },
      ]).itemCount,
    ).toBe(0);
  });
});
