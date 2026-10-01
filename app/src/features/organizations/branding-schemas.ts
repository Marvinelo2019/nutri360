import { z } from "zod";

export const brandingSchema = z.object({
  name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(120),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Selecciona un color válido."),
  phoneE164: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(
        /^\+[1-9][0-9]{7,14}$/,
        "Usa formato internacional, por ejemplo +50255555555.",
      ),
  ]),
  removeLogo: z.boolean(),
});

export type BrandingFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialBrandingFormState: BrandingFormState = { status: "idle" };
