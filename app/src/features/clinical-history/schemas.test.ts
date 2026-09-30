import { describe, expect, it } from "vitest";

import { clinicalHistorySchema, labResultSchema } from "./schemas";

describe("clinical history schemas", () => {
  it("keeps optional habit numbers empty", () => {
    const result = clinicalHistorySchema.parse({
      patientId: crypto.randomUUID(),
      waterLiters: "",
      sleepHours: "",
    });
    expect(result.waterLiters).toBeUndefined();
    expect(result.sleepHours).toBeUndefined();
  });

  it("accepts a numeric laboratory result", () => {
    expect(
      labResultSchema.safeParse({
        patientId: crypto.randomUUID(),
        testName: "Glucosa",
        resultValue: "95",
        unit: "mg/dL",
        referenceMin: "70",
        referenceMax: "100",
        collectedOn: "2026-09-29",
        notes: "Ayuno",
      }).success,
    ).toBe(true);
  });

  it("rejects an inverted reference interval", () => {
    expect(
      labResultSchema.safeParse({
        patientId: crypto.randomUUID(),
        testName: "Glucosa",
        resultValue: "95",
        unit: "mg/dL",
        referenceMin: "100",
        referenceMax: "70",
        collectedOn: "2026-09-29",
      }).success,
    ).toBe(false);
  });
});
