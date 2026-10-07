import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`);
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().min(min).max(max).optional(),
  );

export const createIntakeInviteSchema = z.object({
  patientId: z.uuid(),
  expiryDays: z.coerce.number().int().min(1).max(30),
});

export const revokeIntakeInviteSchema = z.object({
  inviteId: z.uuid(),
  patientId: z.uuid(),
});

export const publicIntakeSchema = z.object({
  consent: z.literal("on", "Debes aceptar el aviso de privacidad."),
  consentVersion: z.string().trim().min(1).max(40),
  medicalHistory: optionalText(8000),
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

export type IntakeFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
  path?: string;
  values?: Record<string, string>;
};

export const initialIntakeFormState: IntakeFormState = { status: "idle" };
