import { describe, expect, it } from "vitest";

import {
  clinicDateKey,
  formatClinicDate,
  formatCurrency,
  formatClinicTime,
  shiftDateKey,
} from "./format";

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

describe("clinic date and time", () => {
  it("uses Guatemala time for date keys and display", () => {
    const instant = new Date("2026-10-01T03:30:00Z");
    expect(clinicDateKey(instant)).toBe("2026-09-30");
    expect(formatClinicTime(instant)).toMatch(/9:30/);
  });

  it("moves ISO date keys without timezone drift", () => {
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});
