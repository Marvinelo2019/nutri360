import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { encryptSecret } from "@/features/google-calendar/crypto";
import {
  exchangeGoogleAuthorizationCode,
  googleCalendarScopes,
} from "@/features/google-calendar/google-api";
import { processGoogleCalendarSync } from "@/features/google-calendar/worker";
import { getCurrentContext } from "@/lib/auth/session";
import { getGoogleCalendarEnv } from "@/lib/env/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function agendaRedirect(request: NextRequest, result: string) {
  return NextResponse.redirect(
    new URL(`/agenda/configuracion?calendar=${result}`, request.url),
  );
}

export async function GET(request: NextRequest) {
  const context = await getCurrentContext();
  if (!context?.workspace) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (
    context.workspace.role !== "owner" &&
    context.workspace.role !== "nutritionist"
  ) {
    return agendaRedirect(request, "unauthorized");
  }
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");
  if (
    providerError ||
    !code ||
    !state ||
    code.length > 4096 ||
    state.length > 256
  ) {
    return agendaRedirect(request, providerError ? "denied" : "invalid");
  }

  try {
    const environment = getGoogleCalendarEnv();
    const tokens = await exchangeGoogleAuthorizationCode(environment, code);
    if (!tokens.refresh_token) {
      return agendaRedirect(request, "missing-refresh-token");
    }
    const encrypted = encryptSecret(
      tokens.refresh_token,
      environment.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY,
    );
    const grantedScopes = tokens.scope
      ? tokens.scope.split(" ").filter(Boolean)
      : [...googleCalendarScopes];
    const admin = createAdminSupabaseClient();
    const stateHash = createHash("sha256").update(state).digest("hex");
    const { data: connectionId, error } = await admin.rpc(
      "complete_google_calendar_connection",
      {
        encrypted_refresh_token: encrypted.ciphertext,
        granted_scopes: grantedScopes,
        oauth_state_hash: stateHash,
        refresh_token_auth_tag: encrypted.authTag,
        refresh_token_iv: encrypted.iv,
        target_professional_user_id: context.userId,
      },
    );
    if (error || !connectionId) return agendaRedirect(request, "invalid");
    await processGoogleCalendarSync({ connectionId }).catch(() => undefined);
    return agendaRedirect(request, "connected");
  } catch {
    return agendaRedirect(request, "error");
  }
}
