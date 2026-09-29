import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./schemas";

describe("authentication schemas", () => {
  it("normalizes a valid login email", () => {
    const result = loginSchema.parse({
      email: "  Nutri@Example.com ",
      password: "secret",
    });

    expect(result.email).toBe("nutri@example.com");
  });

  it("rejects weak and mismatched registration passwords", () => {
    const result = registerSchema.safeParse({
      fullName: "Ana López",
      email: "ana@example.com",
      password: "abcdefgh",
      confirmPassword: "different",
    });

    expect(result.success).toBe(false);
  });
});
