import { describe, expect, it } from "vitest";

import { packageDefinitionSchema, sellPackageSchema } from "./schemas";

describe("package schemas", () => {
  it("converts a package price to integer centavos", () => {
    expect(
      packageDefinitionSchema.parse({
        name: "Seguimiento",
        price: "450.50",
        sessionCount: "4",
        validityDays: "90",
      }).price,
    ).toBe(45_050);
  });

  it("rejects package definitions outside supported bounds", () => {
    expect(
      packageDefinitionSchema.safeParse({
        name: "X",
        price: "0",
        sessionCount: "101",
        validityDays: "0",
      }).success,
    ).toBe(false);
  });

  it("accepts a sale without creating a linked payment", () => {
    expect(
      sellPackageSchema.safeParse({
        patientId: "10000000-0000-4000-8000-000000000001",
        packageId: "20000000-0000-4000-8000-000000000001",
        purchaseDate: "2026-10-06",
        createPayment: false,
        paymentMethod: "cash",
        paymentStatus: "pending",
        paymentReference: "",
      }).success,
    ).toBe(true);
  });
});
