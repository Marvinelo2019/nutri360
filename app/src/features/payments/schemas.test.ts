import { describe, expect, it } from "vitest";

import { paymentSchema, quetzalesToCentavos } from "./schemas";

describe("payment schemas", () => {
  it("converts quetzales to integer centavos", () => {
    expect(quetzalesToCentavos("350.50")).toBe(35050);
    expect(quetzalesToCentavos("125,25")).toBe(12525);
  });

  it("accepts a valid local payment", () => {
    const result = paymentSchema.parse({
      patientId: crypto.randomUUID(),
      amount: "350.00",
      method: "cash",
      status: "paid",
      date: "2026-09-29",
      reference: "",
    });
    expect(result.amount).toBe(35000);
  });

  it("rejects zero and excessive decimal precision", () => {
    expect(
      paymentSchema.safeParse({
        patientId: crypto.randomUUID(),
        amount: "0",
        method: "cash",
        status: "paid",
        date: "2026-09-29",
      }).success,
    ).toBe(false);
    expect(
      paymentSchema.safeParse({
        patientId: crypto.randomUUID(),
        amount: "10.999",
        method: "cash",
        status: "paid",
        date: "2026-09-29",
      }).success,
    ).toBe(false);
  });
});
