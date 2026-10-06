import "server-only";

import { z } from "zod";

import { getPublicSupabaseEnv } from "./public";

const privilegedSupabaseEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type PrivilegedSupabaseEnv = z.infer<typeof privilegedSupabaseEnvSchema>;

export function parsePrivilegedSupabaseEnv(
  environment: Record<string, string | undefined>,
): PrivilegedSupabaseEnv {
  const result = privilegedSupabaseEnvSchema.safeParse(environment);

  if (!result.success) {
    throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY.", {
      cause: result.error,
    });
  }

  return result.data;
}

export function getPrivilegedSupabaseEnv() {
  return {
    ...getPublicSupabaseEnv(),
    ...parsePrivilegedSupabaseEnv({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }),
  };
}

const reminderWorkerEnvSchema = z.object({
  CRON_SECRET: z.string().min(32),
});

export function getReminderWorkerSecret() {
  const result = reminderWorkerEnvSchema.safeParse({
    CRON_SECRET: process.env.CRON_SECRET,
  });
  if (!result.success) {
    throw new Error("Falta configurar un CRON_SECRET seguro.", {
      cause: result.error,
    });
  }
  return result.data.CRON_SECRET;
}

const twilioSandboxEnvSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[0-9a-fA-F]{32}$/),
  TWILIO_AUTH_TOKEN: z.string().min(16),
  TWILIO_WHATSAPP_FROM: z.string().regex(/^whatsapp:\+[1-9][0-9]{7,14}$/),
  TWILIO_SANDBOX_RECIPIENT: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
  TWILIO_SANDBOX_ORGANIZATION_ID: z.uuid(),
  TWILIO_APPOINTMENT_CONTENT_SID: z
    .string()
    .regex(/^HX[0-9a-fA-F]{32}$/)
    .default("HXb5b62575e6e4ff6129ad7c8efe1f983e"),
});

export type TwilioSandboxEnv = z.infer<typeof twilioSandboxEnvSchema>;

function twilioSandboxEnvironment() {
  return {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TWILIO_SANDBOX_RECIPIENT: process.env.TWILIO_SANDBOX_RECIPIENT,
    TWILIO_SANDBOX_ORGANIZATION_ID: process.env.TWILIO_SANDBOX_ORGANIZATION_ID,
    TWILIO_APPOINTMENT_CONTENT_SID: process.env.TWILIO_APPOINTMENT_CONTENT_SID,
  };
}

export function getTwilioSandboxEnv(): TwilioSandboxEnv {
  const result = twilioSandboxEnvSchema.safeParse(twilioSandboxEnvironment());
  if (!result.success) {
    throw new Error("Falta configurar el Sandbox de Twilio.", {
      cause: result.error,
    });
  }
  return result.data;
}

export function isTwilioSandboxConfigured() {
  return twilioSandboxEnvSchema.safeParse(twilioSandboxEnvironment()).success;
}
