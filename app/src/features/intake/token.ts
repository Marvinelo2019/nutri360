import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createIntakeToken() {
  return randomBytes(32).toString("base64url");
}

export function isIntakeToken(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function hashIntakeToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
