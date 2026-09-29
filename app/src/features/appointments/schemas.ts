import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.uuid("Selecciona un paciente."),
  professionalUserId: z.uuid("Selecciona un profesional."),
  date: z.iso.date("Ingresa una fecha válida."),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresa una hora válida."),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(30, "La duración mínima es 30 minutos.")
    .max(240, "La duración máxima es 4 horas."),
  modality: z.enum(["in_person", "video", "phone"]),
});

export const appointmentStatusSchema = z.enum([
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
  "rescheduled",
]);

export type AppointmentFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialAppointmentState: AppointmentFormState = { status: "idle" };
