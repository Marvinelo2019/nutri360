import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`).optional();

export function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^\d{8}$/.test(compact)) return `+502${compact}`;
  return compact;
}

export const patientSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresa el nombre.").max(80),
  lastName: z.string().trim().min(1, "Ingresa el apellido.").max(80),
  birthDate: z.iso
    .date("Ingresa una fecha válida.")
    .refine(
      (date) => new Date(`${date}T12:00:00`) <= new Date(),
      "La fecha no puede estar en el futuro.",
    ),
  growthReferenceSex: z.enum(["female", "male"]).optional(),
  phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((phone) => phone === "" || /^\+[1-9]\d{7,14}$/.test(phone), {
      message: "Usa 8 dígitos de Guatemala o formato internacional.",
    }),
  email: z.union([z.literal(""), z.email("Ingresa un correo válido.")]),
  goal: optionalText(1000),
  consultationReason: optionalText(2000),
  consent: z.literal("accepted", {
    error: "Debes confirmar el consentimiento.",
  }),
});

const optionalMeasurement = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().min(minimum).max(maximum).optional(),
  );

export const measurementSchema = z.object({
  patientId: z.uuid(),
  weightKg: z.coerce
    .number()
    .min(20, "Mínimo 20 kg.")
    .max(300, "Máximo 300 kg."),
  heightCm: z.coerce
    .number()
    .min(50, "Mínimo 50 cm.")
    .max(250, "Máximo 250 cm."),
  waistCm: optionalMeasurement(30, 250),
  hipCm: optionalMeasurement(30, 250),
  armCm: optionalMeasurement(10, 100),
  thighCm: optionalMeasurement(15, 150),
  calfCm: optionalMeasurement(10, 100),
  tricepsMm: optionalMeasurement(1, 100),
  subscapularMm: optionalMeasurement(1, 100),
  suprailiacMm: optionalMeasurement(1, 100),
  abdominalMm: optionalMeasurement(1, 100),
});

export type PatientFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

export type MeasurementFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialPatientState: PatientFormState = { status: "idle" };
export const initialMeasurementState: MeasurementFormState = { status: "idle" };
