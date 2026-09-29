import { describe, expect, it } from "vitest";

import { calculateAdultAnthropometry, classifyBmi } from "./anthropometry";

describe("adult anthropometry", () => {
  it("calculates the same core values stored by the database", () => {
    expect(calculateAdultAnthropometry(70, 175)).toEqual({
      bmi: 22.86,
      classification: "normal",
      weightLb: 154.32,
      normalWeightMinKg: 56.66,
      normalWeightMaxKg: 76.26,
    });
  });

  it("classifies BMI boundaries", () => {
    expect(classifyBmi(18.49)).toBe("underweight");
    expect(classifyBmi(18.5)).toBe("normal");
    expect(classifyBmi(30)).toBe("obesity_i");
  });
});
