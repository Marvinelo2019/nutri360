import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresa un correo electrónico válido."));

const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Za-z]/, "Incluye al menos una letra.")
  .regex(/[0-9]/, "Incluye al menos un número.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Ingresa tu nombre completo.")
      .max(120, "El nombre es demasiado largo."),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Partial<
    Record<"fullName" | "email" | "password" | "confirmPassword", string[]>
  >;
};

export const initialAuthFormState: AuthFormState = { status: "idle" };
