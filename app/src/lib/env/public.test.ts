import { describe, expect, it } from "vitest";

import { parsePublicSupabaseEnv } from "./public";

describe("parsePublicSupabaseEnv", () => {
  it("accepts browser-safe Supabase configuration", () => {
    expect(
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    });
  });

  it("rejects missing or malformed configuration", () => {
    expect(() =>
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      }),
    ).toThrow("Falta configurar");
  });
});
