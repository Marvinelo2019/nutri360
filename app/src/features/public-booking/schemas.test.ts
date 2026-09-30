import { describe, expect, it } from "vitest";

import {
  availabilityRuleSchema,
  normalizeGuatemalaPhone,
  publicBookingSchema,
} from "./schemas";

describe("public booking validation", () => {
  it("normalizes a Guatemala local phone number", () => {
    expect(normalizeGuatemalaPhone("5555 5555")).toBe("+50255555555");
  });

  it("rejects an inverted availability window", () => {
    expect(
      availabilityRuleSchema.safeParse({
        professionalUserId: "10000000-0000-4000-8000-000000000001",
        weekday: "1",
        startTime: "11:00",
        endTime: "09:00",
      }).success,
    ).toBe(false);
  });

  it("accepts the minimum public booking payload", () => {
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(
      publicBookingSchema.safeParse({
        professionalUserId: "10000000-0000-4000-8000-000000000001",
        startsAt: `${tomorrow}T15:00:00.000Z`,
        firstName: "Ana",
        lastName: "Pérez",
        birthDate: "1990-05-20",
        phone: "5555-5555",
        email: "",
        consent: "on",
      }).success,
    ).toBe(true);
  });
});
