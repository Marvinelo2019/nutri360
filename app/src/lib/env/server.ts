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
