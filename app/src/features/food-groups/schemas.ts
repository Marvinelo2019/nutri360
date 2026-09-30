import { z } from "zod";

const nutrient = (maximum: number, label: string) =>
  z.coerce
    .number()
    .min(0, `${label} no puede ser negativo.`)
    .max(maximum, `${label} supera el máximo permitido.`);

export const foodGroupSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del grupo.").max(100),
  description: z.string().trim().max(500).optional(),
  portionGuidance: z.string().trim().max(300).optional(),
  energyKcal: z.coerce
    .number()
    .int("La energía debe ser un número entero.")
    .min(0)
    .max(2000),
  proteinG: nutrient(250, "La proteína"),
  carbohydrateG: nutrient(250, "Los carbohidratos"),
  fatG: nutrient(100, "La grasa"),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

export type FoodGroupFormValues = {
  name: string;
  description: string;
  portionGuidance: string;
  energyKcal: string;
  proteinG: string;
  carbohydrateG: string;
  fatG: string;
  sortOrder: string;
  isActive: boolean;
};

export type FoodGroupFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
  values?: FoodGroupFormValues;
  attempt?: number;
};

export const initialFoodGroupState: FoodGroupFormState = { status: "idle" };
