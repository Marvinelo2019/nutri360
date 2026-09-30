import { describe, expect, it } from "vitest";

import { presentPublicBookingSlots } from "./presentation";

describe("public booking presentation", () => {
  it("prepares stable server-owned date and time labels", () => {
    const [slot] = presentPublicBookingSlots(
      [
        {
          ends_at: "2026-10-01T16:00:00.000Z",
          professional_name: "Nutricionista",
          professional_user_id: "10000000-0000-4000-8000-000000000001",
          starts_at: "2026-10-01T15:00:00.000Z",
        },
      ],
      "America/Guatemala",
    );

    expect(slot.date_key).toBe("2026-10-01");
    expect(slot.date_label).toContain("1 de octubre");
    expect(slot.time_label).toMatch(/^9:00/);
    expect(slot.time_label).not.toMatch(/[\u00a0\u202f]/);
  });
});
