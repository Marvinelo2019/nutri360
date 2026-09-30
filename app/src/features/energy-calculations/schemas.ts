import { z } from "zod";

export const energyCalculationSchema = z
  .object({
    patientId: z.uuid(),
    measurementId: z.uuid("Selecciona una medición válida."),
    formula: z.enum([
      "mifflin_st_jeor",
      "harris_benedict_revised",
      "fao_who_unu",
    ]),
    activityFactor: z.coerce
      .number()
      .min(1, "El factor mínimo es 1.00.")
      .max(2.5, "El factor máximo es 2.50."),
    goalAdjustmentKcal: z.coerce
      .number()
      .int("Usa un número entero de kcal.")
      .min(-1500, "El ajuste mínimo es -1500 kcal.")
      .max(1500, "El ajuste máximo es 1500 kcal."),
    macroMethod: z.enum(["percentage", "grams_per_kg"]),
    proteinInput: z.coerce.number().min(0),
    carbohydrateInput: z.coerce.number().min(0),
    fatInput: z.coerce.number().min(0),
  })
  .superRefine((data, context) => {
    if (data.macroMethod === "percentage") {
      if (
        data.proteinInput > 100 ||
        data.carbohydrateInput > 100 ||
        data.fatInput > 100
      ) {
        context.addIssue({
          code: "custom",
          path: ["proteinInput"],
          message: "Cada porcentaje debe estar entre 0 y 100.",
        });
      }
      const total = data.proteinInput + data.carbohydrateInput + data.fatInput;
      if (Math.abs(total - 100) > 0.01) {
        context.addIssue({
          code: "custom",
          path: ["macroMethod"],
          message: `Los porcentajes deben sumar 100%. Total actual: ${total}%.`,
        });
      }
      return;
    }

    const limits = [
      ["proteinInput", data.proteinInput, 10],
      ["carbohydrateInput", data.carbohydrateInput, 15],
      ["fatInput", data.fatInput, 5],
    ] as const;
    for (const [path, value, maximum] of limits) {
      if (value > maximum) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: `El máximo permitido es ${maximum} g/kg.`,
        });
      }
    }
  });

export type EnergyCalculationValues = {
  measurementId: string;
  formula: string;
  activityFactor: string;
  goalAdjustmentKcal: string;
  macroMethod: string;
  proteinInput: string;
  carbohydrateInput: string;
  fatInput: string;
};

export type EnergyCalculationFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[]>;
  values?: EnergyCalculationValues;
  attempt?: number;
};

export const initialEnergyCalculationState: EnergyCalculationFormState = {
  status: "idle",
};
