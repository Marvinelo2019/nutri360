import { z } from "zod";

export function quetzalesToCentavos(value: string) {
  return Math.round(Number(value.trim().replace(",", ".")) * 100);
}

export const paymentSchema = z.object({
  patientId: z.uuid("Selecciona un paciente."),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,7}([.,]\d{1,2})?$/, "Ingresa un monto válido.")
    .transform(quetzalesToCentavos)
    .refine((amount) => amount > 0, "El monto debe ser mayor a cero.")
    .refine(
      (amount) => amount <= 100_000_000,
      "El monto excede el límite permitido.",
    ),
  method: z.enum(["cash", "card", "transfer", "other"]),
  status: z.enum(["pending", "paid"]),
  date: z.iso.date("Ingresa una fecha válida."),
  reference: z.string().trim().max(100).optional(),
});

export type PaymentFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};
export const initialPaymentState: PaymentFormState = { status: "idle" };
