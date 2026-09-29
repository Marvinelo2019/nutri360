import { describe, expect, it } from "vitest";

import { appointmentSchema, appointmentStatusSchema } from "./schemas";

const valid = {
  patientId: crypto.randomUUID(),
  professionalUserId: crypto.randomUUID(),
  date: "2026-10-10",
  time: "09:30",
  durationMinutes: "60",
  modality: "in_person",
};

describe("appointment schemas", () => {
  it("accepts a valid appointment and coerces duration", () => {
    const result = appointmentSchema.parse(valid);
    expect(result.durationMinutes).toBe(60);
  });

  it("rejects invalid time and duration", () => {
    expect(
      appointmentSchema.safeParse({
        ...valid,
        time: "25:00",
        durationMinutes: 15,
      }).success,
    ).toBe(false);
  });

  it("does not expose pending as a manual transition", () => {
    expect(appointmentStatusSchema.safeParse("pending").success).toBe(false);
  });
});
