import { createHash, randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { googleAuthorizationUrl } from "@/features/google-calendar/google-api";
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
  try {
    const environment = getGoogleCalendarEnv();
    const state = randomBytes(32).toString("base64url");
    const stateHash = createHash("sha256").update(state).digest("hex");
    const admin = createAdminSupabaseClient();
    const { error } = await admin.rpc("create_google_calendar_oauth_state", {
      oauth_state_hash: stateHash,
      target_organization_id: context.workspace.id,
      target_professional_user_id: context.userId,
    });
    if (error) return agendaRedirect(request, "error");
    return NextResponse.redirect(googleAuthorizationUrl(environment, state));
  } catch {
    return agendaRedirect(request, "not-configured");
  }
}
