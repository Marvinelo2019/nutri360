import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getReminderWorkerSecret, getTwilioSandboxEnv } from "@/lib/env/server";
import { processTwilioSandboxReminders } from "@/features/reminders/twilio-sandbox";

export const runtime = "nodejs";

function validBearerToken(request: NextRequest) {
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  if (!provided) return false;
  const expected = getReminderWorkerSecret();
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!validBearerToken(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json(
      { error: "worker_not_configured" },
      { status: 503 },
    );
  }

  try {
    const config = getTwilioSandboxEnv();
    const result = await processTwilioSandboxReminders(
      config.TWILIO_SANDBOX_ORGANIZATION_ID,
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "sandbox_worker_failed" },
      { status: 503 },
    );
  }
}
