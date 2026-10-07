import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./crypto";

describe("Google Calendar secret encryption", () => {
  const key = Buffer.alloc(32, 7).toString("base64");

  it("round-trips a refresh token without storing plaintext", () => {
    const encrypted = encryptSecret("synthetic-refresh-token", key);
    expect(encrypted.ciphertext).not.toContain("synthetic-refresh-token");
    expect(decryptSecret(encrypted, key)).toBe("synthetic-refresh-token");
  });

  it("fails authentication when ciphertext changes", () => {
    const encrypted = encryptSecret("synthetic-refresh-token", key);
    expect(() =>
      decryptSecret(
        { ...encrypted, ciphertext: `${encrypted.ciphertext}a` },
        key,
      ),
    ).toThrow();
  });
});
