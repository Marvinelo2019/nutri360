import { describe, expect, it } from "vitest";

import { createOrganizationSlug, organizationSchema } from "./schemas";

describe("organization onboarding", () => {
  it("creates a database-safe unique slug", () => {
    expect(
      createOrganizationSlug(
        "Clínica Nutrición & Salud",
        "12345678-0000-0000-0000-000000000000",
      ),
    ).toBe("clinica-nutricion-salud-12345678");
  });

  it("rejects an empty clinic name", () => {
    expect(organizationSchema.safeParse({ name: " " }).success).toBe(false);
  });
});
