import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getReminderWorkerSecret } from "@/lib/env/server";

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

  return NextResponse.json(
    {
      error: "delivery_provider_not_configured",
      message:
        "La cola está activa, pero falta conectar el proveedor de mensajería.",
    },
    { status: 503 },
  );
}
