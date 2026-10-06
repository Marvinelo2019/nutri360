import "server-only";

import { randomUUID } from "node:crypto";

import { getTwilioSandboxEnv, type TwilioSandboxEnv } from "@/lib/env/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

import { appointmentTemplateVariables } from "./twilio-message";

type TwilioResponse = { code?: number; sid?: string };

function normalizedTwilioError(status: number, payload: TwilioResponse | null) {
  if (typeof payload?.code === "number") return `twilio_${payload.code}`;
  return `twilio_http_${status}`;
}

async function sendSandboxMessage(
  startsAt: string,
  config: TwilioSandboxEnv,
): Promise<
  | { accepted: true; messageSid: string }
  | { accepted: false; errorCode: string }
> {
  const body = new URLSearchParams({
    ContentSid: config.TWILIO_APPOINTMENT_CONTENT_SID,
    ContentVariables: JSON.stringify(appointmentTemplateVariables(startsAt)),
    From: config.TWILIO_WHATSAPP_FROM,
    To: `whatsapp:${config.TWILIO_SANDBOX_RECIPIENT}`,
  });
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        body,
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`,
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const payload = (await response
      .json()
      .catch(() => null)) as TwilioResponse | null;
    if (!response.ok) {
      return {
        accepted: false,
        errorCode: normalizedTwilioError(response.status, payload),
      };
    }
    if (!payload?.sid || !/^(SM|MM)[0-9a-fA-F]{32}$/.test(payload.sid)) {
      return { accepted: false, errorCode: "twilio_invalid_response" };
    }
    return { accepted: true, messageSid: payload.sid };
  } catch {
    return { accepted: false, errorCode: "twilio_unavailable" };
  }
}

export type SandboxRunResult = {
  claimed: number;
  failed: number;
  sent: number;
};

export async function processTwilioSandboxReminders(
  organizationId: string,
): Promise<SandboxRunResult> {
  const config = getTwilioSandboxEnv();
  if (config.TWILIO_SANDBOX_ORGANIZATION_ID !== organizationId) {
    throw new Error("Twilio Sandbox is not enabled for this organization.");
  }

  const workerId = `twilio-sandbox:${randomUUID()}`;
  const supabase = createAdminSupabaseClient();
  const { data: reminders, error: claimError } = await supabase.rpc(
    "claim_due_twilio_sandbox_reminders",
    {
      batch_size: 1,
      sandbox_recipient_phone: config.TWILIO_SANDBOX_RECIPIENT,
      target_organization_id: organizationId,
      worker_id: workerId,
    },
  );
  if (claimError) throw new Error("Could not claim sandbox reminder.");

  const result: SandboxRunResult = {
    claimed: reminders.length,
    failed: 0,
    sent: 0,
  };
  for (const reminder of reminders) {
    const delivery = await sendSandboxMessage(
      reminder.appointment_starts_at,
      config,
    );
    const { error: completionError } = await supabase.rpc(
      "complete_appointment_reminder",
      {
        delivery_outcome: delivery.accepted ? "sent" : "failed",
        external_message_id: delivery.accepted ? delivery.messageSid : null,
        normalized_error_code: delivery.accepted ? null : delivery.errorCode,
        provider_name: "twilio_sandbox",
        target_reminder_id: reminder.reminder_id,
        worker_id: workerId,
      },
    );
    if (completionError) {
      throw new Error("Could not record sandbox delivery result.");
    }
    if (delivery.accepted) result.sent += 1;
    else result.failed += 1;
  }
  return result;
}
