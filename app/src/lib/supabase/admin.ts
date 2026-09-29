import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPrivilegedSupabaseEnv } from "@/lib/env/server";

export function createAdminSupabaseClient() {
  const environment = getPrivilegedSupabaseEnv();

  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
