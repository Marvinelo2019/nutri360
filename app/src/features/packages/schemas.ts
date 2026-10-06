import { z } from "zod";

import { quetzalesToCentavos } from "../payments/schemas";

const positiveInteger = (message: string, maximum: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .transform(Number)
    .refine((value) => value >= 1 && value <= maximum, message);

export const packageDefinitionSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre.").max(100),
  sessionCount: positiveInteger("Usa entre 1 y 100 sesiones.", 100),
  price: z
    .string()
    .trim()
    .regex(/^\d{1,7}([.,]\d{1,2})?$/, "Ingresa un precio válido.")
    .transform(quetzalesToCentavos)
    .refine((value) => value > 0, "El precio debe ser mayor a cero."),
  validityDays: positiveInteger("Usa entre 1 y 730 días.", 730),
});

export const sellPackageSchema = z.object({
  patientId: z.uuid("Selecciona un paciente."),
  packageId: z.uuid("Selecciona un paquete."),
  purchaseDate: z.iso.date("Ingresa una fecha válida."),
  createPayment: z.boolean(),
  paymentMethod: z.enum(["cash", "card", "transfer", "other"]),
  paymentStatus: z.enum(["pending", "paid"]),
  paymentReference: z.string().trim().max(100).optional(),
});

export const packageIdSchema = z.uuid();

export const consumeSessionSchema = z.object({
  patientPackageId: z.uuid(),
  appointmentId: z.uuid("Selecciona una cita completada."),
});

export type PackageFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialPackageFormState: PackageFormState = { status: "idle" };
