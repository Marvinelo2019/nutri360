import { describe, expect, it } from "vitest";

import { foodGroupSchema } from "./schemas";

const valid = {
  name: "Cereales",
  description: "Grupo configurable",
  portionGuidance: "1/2 taza cocida",
  energyKcal: "70",
  proteinG: "3",
  carbohydrateG: "15",
  fatG: "0",
  sortOrder: "10",
  isActive: true,
};

describe("foodGroupSchema", () => {
  it("accepts bounded nutrient values", () => {
    expect(foodGroupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects negative nutrients", () => {
    expect(
      foodGroupSchema.safeParse({ ...valid, proteinG: "-1" }).success,
    ).toBe(false);
  });

  it("rejects values outside supported bounds", () => {
    expect(
      foodGroupSchema.safeParse({ ...valid, energyKcal: "2001" }).success,
    ).toBe(false);
  });
});
