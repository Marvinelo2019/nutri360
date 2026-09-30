import { z } from "zod";

const optionalNumber = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().min(minimum).max(maximum).optional(),
  );

export const mealPlanSchema = z
  .object({
    patientId: z.uuid("Selecciona un paciente."),
    name: z.string().trim().min(1, "Ingresa un nombre.").max(120),
    startsOn: z.union([z.literal(""), z.iso.date()]),
    endsOn: z.union([z.literal(""), z.iso.date()]),
    energyKcal: optionalNumber(500, 8000),
    proteinG: optionalNumber(0, 1000),
    carbohydrateG: optionalNumber(0, 1500),
    fatG: optionalNumber(0, 500),
    instructions: z.string().trim().max(4000).optional(),
  })
  .refine(
    (data) => !data.startsOn || !data.endsOn || data.endsOn >= data.startsOn,
    {
      path: ["endsOn"],
      message: "La fecha final debe ser posterior a la inicial.",
    },
  );

export const mealItemSchema = z.object({
  mealId: z.uuid(),
  planId: z.uuid(),
  foodName: z.string().trim().min(1, "Ingresa el alimento.").max(160),
  quantity: z.coerce
    .number()
    .positive("La cantidad debe ser mayor a cero.")
    .max(10000),
  unit: z.string().trim().min(1, "Ingresa la unidad.").max(40),
  guidance: z.string().trim().max(500).optional(),
});

export const mealItemUpdateSchema = mealItemSchema
  .omit({ mealId: true })
  .extend({
    itemId: z.uuid(),
  });

export type MealPlanFormValues = {
  patientId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  energyKcal: string;
  proteinG: string;
  carbohydrateG: string;
  fatG: string;
  instructions: string;
};

export type MealPlanFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[]>;
  values?: MealPlanFormValues;
  attempt?: number;
};
export type MealItemFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};
export const initialMealPlanState: MealPlanFormState = { status: "idle" };
export const initialMealItemState: MealItemFormState = { status: "idle" };
