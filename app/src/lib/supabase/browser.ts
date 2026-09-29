"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/env/public";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getBrowserSupabaseClient() {
  const environment = getPublicSupabaseEnv();

  browserClient ??= createBrowserClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return browserClient;
}
