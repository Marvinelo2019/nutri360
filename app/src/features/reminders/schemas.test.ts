import { describe, expect, it } from "vitest";

import { reminderSettingsSchema } from "./schemas";

describe("reminderSettingsSchema", () => {
  it("accepts a supported channel and explicit switches", () => {
    expect(
      reminderSettingsSchema.safeParse({
        channel: "whatsapp",
        confirmationEnabled: true,
        reminder24hEnabled: true,
        reminder2hEnabled: false,
      }).success,
    ).toBe(true);
  });

  it("rejects channels that the delivery queue does not support", () => {
    expect(
      reminderSettingsSchema.safeParse({
        channel: "push",
        confirmationEnabled: true,
        reminder24hEnabled: true,
        reminder2hEnabled: true,
      }).success,
    ).toBe(false);
  });
});
