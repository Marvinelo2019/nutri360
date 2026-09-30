import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`).optional();
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().min(min).max(max).optional(),
  );

export const clinicalHistorySchema = z.object({
  patientId: z.uuid(),
  medicalHistory: optionalText(8000),
  diagnoses: optionalText(4000),
  familyHistory: optionalText(4000),
  allergies: optionalText(4000),
  medications: optionalText(4000),
  recall24h: optionalText(12000),
  eatingHabits: optionalText(8000),
  waterLiters: optionalNumber(0, 20),
  sleepHours: optionalNumber(0, 24),
  physicalActivity: optionalText(4000),
  preferences: optionalText(4000),
  restrictions: optionalText(4000),
});

export const labResultSchema = z
  .object({
    patientId: z.uuid(),
    testName: z
      .string()
      .trim()
      .min(1, "Ingresa el nombre del examen.")
      .max(160),
    resultValue: z.coerce.number("Ingresa un resultado numérico."),
    unit: z.string().trim().min(1, "Ingresa la unidad.").max(40),
    referenceMin: optionalNumber(-1000000000, 1000000000),
    referenceMax: optionalNumber(-1000000000, 1000000000),
    collectedOn: z.iso.date("Ingresa una fecha válida."),
    notes: optionalText(2000),
  })
  .refine(
    (data) =>
      data.referenceMin === undefined ||
      data.referenceMax === undefined ||
      data.referenceMax >= data.referenceMin,
    { path: ["referenceMax"], message: "El máximo debe ser mayor al mínimo." },
  );

export type ClinicalHistoryState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};
export const initialClinicalHistoryState: ClinicalHistoryState = {
  status: "idle",
};
