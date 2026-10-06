import { describe, expect, it } from "vitest";

import { appointmentTemplateVariables } from "./twilio-message";

describe("appointmentTemplateVariables", () => {
  it("formats the appointment in the clinic time zone", () => {
    expect(appointmentTemplateVariables("2026-10-01T22:00:00.000Z")).toEqual({
      "1": "jueves, 1 de octubre de 2026",
      "2": "4:00 p. m.",
    });
  });
});
