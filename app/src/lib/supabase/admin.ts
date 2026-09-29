import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPrivilegedSupabaseEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

export function createAdminSupabaseClient() {
  const environment = getPrivilegedSupabaseEnv();

  return createClient<Database>(
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
