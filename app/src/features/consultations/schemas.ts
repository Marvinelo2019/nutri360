import { z } from "zod";

const note = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`);

export const consultationCreateSchema = z.object({
  patientId: z.uuid(),
  consultationType: z.enum(["initial", "follow_up"]),
  date: z.iso.date("Ingresa una fecha válida."),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresa una hora válida."),
});

export const consultationDraftSchema = z.object({
  consultationId: z.uuid(),
  patientId: z.uuid(),
  subjective: note(8000),
  objective: note(8000),
  assessment: note(8000),
  plan: note(8000),
  clinicalSummary: note(4000),
});

export type ConsultationValues = Omit<
  z.input<typeof consultationDraftSchema>,
  "consultationId" | "patientId"
>;

export type ConsultationFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
  values?: ConsultationValues;
  attempt?: number;
};

export const initialConsultationState: ConsultationFormState = {
  status: "idle",
};
