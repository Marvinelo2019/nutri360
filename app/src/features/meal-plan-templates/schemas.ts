import { z } from "zod";

export const saveTemplateSchema = z.object({
  planId: z.uuid(),
  name: z.string().trim().min(1, "Ingresa un nombre.").max(120),
  category: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
});

export const useTemplateSchema = z
  .object({
    templateId: z.uuid(),
    patientId: z.uuid("Selecciona un paciente."),
    name: z.string().trim().min(1, "Ingresa un nombre.").max(120),
    startsOn: z.union([z.literal(""), z.iso.date()]),
    endsOn: z.union([z.literal(""), z.iso.date()]),
  })
  .refine(
    (value) =>
      !value.startsOn || !value.endsOn || value.endsOn >= value.startsOn,
    {
      path: ["endsOn"],
      message: "La fecha final debe ser posterior a la inicial.",
    },
  );

export type TemplateFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialTemplateFormState: TemplateFormState = { status: "idle" };
