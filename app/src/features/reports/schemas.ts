import { z } from "zod";

export const reportMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Selecciona un mes válido.");

export function monthBounds(month: string) {
  const parsed = reportMonthSchema.parse(month);
  const [year, monthNumber] = parsed.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return {
    firstDate: `${parsed}-01`,
    nextFirstDate: next.toISOString().slice(0, 10),
  };
}
