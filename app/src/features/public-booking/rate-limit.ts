import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { getPrivilegedSupabaseEnv } from "@/lib/env/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function requestFingerprint() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const address = forwarded || requestHeaders.get("x-real-ip") || "local";
  const userAgent =
    requestHeaders.get("user-agent")?.slice(0, 200) || "unknown";
  const { SUPABASE_SERVICE_ROLE_KEY } = getPrivilegedSupabaseEnv();
  return createHmac("sha256", SUPABASE_SERVICE_ROLE_KEY)
    .update(`${address}|${userAgent}`)
    .digest("hex");
}

export async function consumePublicBookingRateLimit(
  scope: string,
  maximumRequests: number,
  windowSeconds: number,
) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc(
    "consume_public_booking_rate_limit",
    {
      maximum_requests: maximumRequests,
      rate_fingerprint_hash: await requestFingerprint(),
      rate_scope: scope.slice(0, 160),
      window_seconds: windowSeconds,
    },
  );
  return !error && data === true;
}
