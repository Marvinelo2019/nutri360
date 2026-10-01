import { describe, expect, it } from "vitest";

import { saveTemplateSchema, useTemplateSchema } from "./schemas";

const id = "10000000-0000-4000-8000-000000000001";

describe("meal plan template schemas", () => {
  it("accepts a named source-plan snapshot", () => {
    expect(
      saveTemplateSchema.safeParse({
        planId: id,
        name: "Plan de mantenimiento",
        category: "Mantenimiento",
        description: "Base reutilizable",
      }).success,
    ).toBe(true);
  });

  it("rejects inverted plan dates", () => {
    expect(
      useTemplateSchema.safeParse({
        templateId: id,
        patientId: id,
        name: "Nuevo plan",
        startsOn: "2026-10-10",
        endsOn: "2026-10-01",
      }).success,
    ).toBe(false);
  });
});
