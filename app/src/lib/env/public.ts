import { z } from "zod";

const publicSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicSupabaseEnv = z.infer<typeof publicSupabaseEnvSchema>;

export function parsePublicSupabaseEnv(
  environment: Record<string, string | undefined>,
): PublicSupabaseEnv {
  const result = publicSupabaseEnvSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(
      "Falta configurar NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      { cause: result.error },
    );
  }

  return result.data;
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return parsePublicSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
