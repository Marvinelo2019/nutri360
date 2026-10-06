import { describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

import { patientPackageDisplayState } from "./presentation";

const base = {
  created_at: "2026-10-01T12:00:00Z",
  created_by: "10000000-0000-4000-8000-000000000001",
  expires_on: "2026-12-31",
  id: "20000000-0000-4000-8000-000000000001",
  organization_id: "30000000-0000-4000-8000-000000000001",
  package_id: "40000000-0000-4000-8000-000000000001",
  package_name_snapshot: "Seguimiento",
  patient_id: "50000000-0000-4000-8000-000000000001",
  price_centavos: 50000,
  purchased_on: "2026-10-01",
  status: "active",
  total_sessions: 4,
  updated_at: "2026-10-01T12:00:00Z",
} satisfies Database["public"]["Tables"]["patient_packages"]["Row"];

describe("patientPackageDisplayState", () => {
  it("prioritizes explicit cancellation", () => {
    expect(
      patientPackageDisplayState(
        { ...base, status: "cancelled" },
        0,
        "2026-10-06",
      ),
    ).toBe("cancelled");
  });

  it("distinguishes exhausted and expired purchases", () => {
    expect(patientPackageDisplayState(base, 0, "2026-10-06")).toBe("exhausted");
    expect(
      patientPackageDisplayState(
        { ...base, expires_on: "2026-10-05" },
        2,
        "2026-10-06",
      ),
    ).toBe("expired");
  });
});
