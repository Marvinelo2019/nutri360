import { z } from "zod";

export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre del consultorio.")
    .max(120, "El nombre es demasiado largo."),
});

export type OrganizationFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: { name?: string[] };
};

export const initialOrganizationFormState: OrganizationFormState = {
  status: "idle",
};

export function createOrganizationSlug(name: string, userId: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/g, "");

  return `${base || "consultorio"}-${userId.slice(0, 8)}`;
}
