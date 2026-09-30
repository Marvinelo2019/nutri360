import { describe, expect, it } from "vitest";

import { consultationCreateSchema, consultationDraftSchema } from "./schemas";

describe("consultation schemas", () => {
  it("accepts a valid local consultation time", () => {
    expect(
      consultationCreateSchema.safeParse({
        patientId: crypto.randomUUID(),
        consultationType: "initial",
        date: "2026-09-29",
        time: "14:30",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid consultation times", () => {
    expect(
      consultationCreateSchema.safeParse({
        patientId: crypto.randomUUID(),
        consultationType: "follow_up",
        date: "2026-09-29",
        time: "25:90",
      }).success,
    ).toBe(false);
  });

  it("enforces the maximum length of SOAP notes", () => {
    expect(
      consultationDraftSchema.safeParse({
        consultationId: crypto.randomUUID(),
        patientId: crypto.randomUUID(),
        subjective: "x".repeat(8001),
        objective: "",
        assessment: "",
        plan: "",
        clinicalSummary: "",
      }).success,
    ).toBe(false);
  });
});
