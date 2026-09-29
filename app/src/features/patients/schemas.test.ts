import { describe, expect, it } from "vitest";

import { measurementSchema, normalizePhone, patientSchema } from "./schemas";

describe("patient schemas", () => {
  it("normalizes Guatemala phone numbers", () => {
    expect(normalizePhone("5555 1234")).toBe("+50255551234");
  });

  it("requires consent", () => {
    const result = patientSchema.safeParse({
      firstName: "Ana",
      lastName: "López",
      birthDate: "1990-01-01",
      phone: "",
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("limits adult measurement ranges", () => {
    expect(
      measurementSchema.safeParse({
        patientId: crypto.randomUUID(),
        weightKg: 70,
        heightCm: 175,
      }).success,
    ).toBe(true);
    expect(
      measurementSchema.safeParse({
        patientId: crypto.randomUUID(),
        weightKg: 10,
        heightCm: 175,
      }).success,
    ).toBe(false);
  });
});
