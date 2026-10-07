import { describe, expect, it } from "vitest";

import { isUnder18, paediatricBmiLabels } from "./paediatric-growth";

describe("paediatric growth presentation", () => {
  it("uses the eighteenth birthday as the adult boundary", () => {
    expect(isUnder18("2008-10-08", new Date("2026-10-07T12:00:00"))).toBe(true);
    expect(isUnder18("2008-10-07", new Date("2026-10-07T12:00:00"))).toBe(
      false,
    );
  });

  it("presents WHO classifications in neutral Spanish", () => {
    expect(paediatricBmiLabels.expected_range).toBe("Rango esperado");
    expect(paediatricBmiLabels.risk_of_overweight).toBe("Riesgo de sobrepeso");
  });
});
