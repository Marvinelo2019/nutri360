import { describe, expect, it } from "vitest";

import type { Database } from "../../types/database";

import { calculateMonthlySummary } from "./summary";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];

const appointment = (status: Appointment["status"]) =>
  ({ status }) as Appointment;
const payment = (status: Payment["status"], amount: number) =>
  ({ status, amount_centavos: amount }) as Payment;

describe("calculateMonthlySummary", () => {
  it("uses only resolved appointments for the no-show rate", () => {
    const result = calculateMonthlySummary({
      appointments: [
        appointment("completed"),
        appointment("completed"),
        appointment("no_show"),
        appointment("cancelled"),
        appointment("confirmed"),
      ],
      payments: [],
      packageSales: [],
      sessionsConsumed: 0,
    });
    expect(result.noShowRate).toBeCloseTo(1 / 3);
    expect(result.cancelledCount).toBe(1);
  });

  it("keeps an unavailable no-show rate distinct from zero", () => {
    expect(
      calculateMonthlySummary({
        appointments: [appointment("confirmed")],
        payments: [],
        packageSales: [],
        sessionsConsumed: 0,
      }).noShowRate,
    ).toBeNull();
  });

  it("reconciles payment states and package sessions", () => {
    const result = calculateMonthlySummary({
      appointments: [],
      payments: [
        payment("paid", 50_000),
        payment("pending", 20_000),
        payment("refunded", 10_000),
      ],
      packageSales: [{ total_sessions: 4 }, { total_sessions: 6 }],
      sessionsConsumed: 3,
    });
    expect(result.paidCentavos).toBe(50_000);
    expect(result.pendingCentavos).toBe(20_000);
    expect(result.sessionsSold).toBe(10);
    expect(result.sessionsConsumed).toBe(3);
  });
});
