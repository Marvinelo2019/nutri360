import { describe, expect, it } from "vitest";

import { product } from "./product";

describe("product defaults", () => {
  it("uses the Guatemala regional configuration", () => {
    expect(product.locale).toBe("es-GT");
    expect(product.currency).toBe("GTQ");
    expect(product.timeZone).toBe("America/Guatemala");
  });
});
