import { describe, expect, it } from "vitest";

import { brandingSchema } from "./branding-schemas";

describe("brandingSchema", () => {
  it("accepts clinic branding with an international phone", () => {
    expect(
      brandingSchema.safeParse({
        name: "Nutrición Integral",
        brandColor: "#2D6A4F",
        phoneE164: "+50255555555",
        removeLogo: false,
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid color or local-only phone", () => {
    expect(
      brandingSchema.safeParse({
        name: "Nutrición Integral",
        brandColor: "green",
        phoneE164: "55555555",
        removeLogo: false,
      }).success,
    ).toBe(false);
  });
});
