import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresa una hora válida.");

const localDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/,
    "Ingresa una fecha y hora válidas.",
  );

export const bookingSettingsSchema = z.object({
  enabled: z.boolean(),
  durationMinutes: z.coerce
    .number()
    .int()
    .refine((value) => [30, 45, 60, 90, 120].includes(value)),
  noticeHours: z.coerce.number().int().min(1).max(168),
  horizonDays: z.coerce.number().int().min(7).max(120),
  modality: z.enum(["in_person", "video", "phone"]),
  instructions: z.string().trim().max(1000).optional(),
});

export const availabilityRuleSchema = z
  .object({
    professionalUserId: z.uuid("Selecciona un profesional."),
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((value) => value.endTime > value.startTime, {
    path: ["endTime"],
    message: "La hora final debe ser posterior a la inicial.",
  });

export const availabilityBlockSchema = z
  .object({
    professionalUserId: z.uuid("Selecciona un profesional."),
    startsAt: localDateTimeSchema,
    endsAt: localDateTimeSchema,
    label: z.string().trim().max(120).optional(),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    path: ["endsAt"],
    message: "El bloqueo debe terminar después de iniciar.",
  });

export function normalizeGuatemalaPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) return `+502${digits}`;
  if (digits.length === 11 && digits.startsWith("502")) return `+${digits}`;
  return trimmed.startsWith("+") ? `+${digits}` : trimmed;
}

const birthDateSchema = z.iso
  .date("Ingresa una fecha de nacimiento válida.")
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    const today = new Date();
    const oldest = new Date();
    oldest.setUTCFullYear(oldest.getUTCFullYear() - 120);
    return date <= today && date >= oldest;
  }, "Revisa la fecha de nacimiento.");

export const publicBookingSchema = z.object({
  professionalUserId: z.uuid("Selecciona un horario disponible."),
  startsAt: z.iso.datetime({ offset: true }),
  firstName: z.string().trim().min(1, "Ingresa tu nombre.").max(80),
  lastName: z.string().trim().min(1, "Ingresa tu apellido.").max(80),
  birthDate: birthDateSchema,
  phone: z
    .string()
    .transform(normalizeGuatemalaPhone)
    .pipe(
      z.string().regex(/^\+[1-9][0-9]{7,14}$/, "Ingresa un teléfono válido."),
    ),
  email: z.union([
    z.literal(""),
    z.email("Ingresa un correo electrónico válido.").max(254),
  ]),
  consent: z.literal("on", "Debes aceptar el aviso de privacidad."),
});

export type BookingFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
};

export const initialBookingFormState: BookingFormState = { status: "idle" };
