import { describe, expect, it } from "vitest";

import { formatClinicDate, formatCurrency } from "./format";

describe("regional formatting", () => {
  it("formats integer centavos in Guatemalan quetzales", () => {
    expect(formatCurrency(125050)).toMatch(/Q\s?1,250\.50/);
  });

  it("renders dates in the Guatemala time zone", () => {
    expect(formatClinicDate(new Date("2026-09-30T03:00:00.000Z"))).toContain(
      "29 de septiembre",
    );
  });
});
