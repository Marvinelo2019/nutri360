import { describe, expect, it } from "vitest";

import { createIntakeInviteSchema, publicIntakeSchema } from "./schemas";

describe("pre-consultation intake schemas", () => {
  it("accepts a bounded invitation lifetime", () => {
    expect(
      createIntakeInviteSchema.safeParse({
        patientId: "00000000-0000-4000-8000-000000000001",
        expiryDays: "7",
      }).success,
    ).toBe(true);
    expect(
      createIntakeInviteSchema.safeParse({
        patientId: "00000000-0000-4000-8000-000000000001",
        expiryDays: "31",
      }).success,
    ).toBe(false);
  });

  it("requires consent and validates health measurements", () => {
    const base = {
      consentVersion: "pre-consultation-v1",
      medicalHistory: "",
      familyHistory: "",
      allergies: "",
      medications: "",
      recall24h: "",
      eatingHabits: "",
      waterLiters: "2.5",
      sleepHours: "8",
      physicalActivity: "",
      preferences: "",
      restrictions: "",
    };
    expect(
      publicIntakeSchema.safeParse({ ...base, consent: "on" }).success,
    ).toBe(true);
    expect(publicIntakeSchema.safeParse(base).success).toBe(false);
    expect(
      publicIntakeSchema.safeParse({ ...base, consent: "on", sleepHours: "25" })
        .success,
    ).toBe(false);
  });
});
