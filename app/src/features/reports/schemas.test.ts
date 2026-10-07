import { describe, expect, it } from "vitest";

import { monthBounds, reportMonthSchema } from "./schemas";

describe("monthly report schemas", () => {
  it("calculates the next boundary across a year", () => {
    expect(monthBounds("2026-12")).toEqual({
      firstDate: "2026-12-01",
      nextFirstDate: "2027-01-01",
    });
  });

  it("rejects invalid month numbers", () => {
    expect(reportMonthSchema.safeParse("2026-13").success).toBe(false);
  });
});
