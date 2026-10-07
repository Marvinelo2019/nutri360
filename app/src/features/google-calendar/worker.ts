import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getGoogleCalendarEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

import { decryptSecret } from "./crypto";
import {
  deleteGoogleCalendarEvent,
  getGoogleBusyPeriods,
  GoogleCalendarProviderError,
  googleEventId,
  refreshGoogleAccessToken,
  upsertGoogleCalendarEvent,
} from "./google-api";

type Connection =
  Database["public"]["Tables"]["google_calendar_connections"]["Row"];

function providerError(error: unknown) {
  return error instanceof GoogleCalendarProviderError
    ? error
    : new GoogleCalendarProviderError("calendar_worker_failed");
}

function decryptedRefreshToken(connection: Connection, encryptionKey: string) {
  return decryptSecret(
    {
      authTag: connection.refresh_token_auth_tag,
      ciphertext: connection.refresh_token_ciphertext,
      iv: connection.refresh_token_iv,
    },
    encryptionKey,
  );
}

export async function processGoogleCalendarSync(options?: {
  connectionId?: string;
  batchSize?: number;
}) {
  const env = getGoogleCalendarEnv();
  const supabase = createAdminSupabaseClient();
  const workerId = `calendar-${randomUUID()}`;
  const { data: jobs, error: claimError } = await supabase.rpc(
    "claim_calendar_sync_jobs",
    {
      batch_size: options?.batchSize ?? 20,
      target_connection_id: options?.connectionId,
      worker_id: workerId,
    },
  );
  if (claimError) throw claimError;

  const connectionIds = [...new Set(jobs.map((job) => job.connection_id))];
  if (options?.connectionId && !connectionIds.includes(options.connectionId)) {
    connectionIds.push(options.connectionId);
  }
  let connectionsQuery = supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("status", "active");
  if (connectionIds.length) {
    connectionsQuery = connectionsQuery.in("id", connectionIds);
  } else {
    connectionsQuery = connectionsQuery
      .or(
        `last_busy_sync_at.is.null,last_busy_sync_at.lt.${new Date(Date.now() - 5 * 60_000).toISOString()}`,
      )
      .limit(20);
  }
  const { data: connections, error: connectionError } = await connectionsQuery;
  if (connectionError) throw connectionError;
  const connectionMap = new Map(
    connections.map((connection) => [connection.id, connection]),
  );
  const accessTokens = new Map<string, string>();

  async function accessToken(connection: Connection) {
    const cached = accessTokens.get(connection.id);
    if (cached) return cached;
    const refreshToken = decryptedRefreshToken(
      connection,
      env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY,
    );
    const token = await refreshGoogleAccessToken(env, refreshToken);
    accessTokens.set(connection.id, token.access_token);
    return token.access_token;
  }

  let succeeded = 0;
  let failed = 0;
  for (const job of jobs) {
    const connection = connectionMap.get(job.connection_id);
    if (!connection) {
      await supabase.rpc("fail_calendar_sync_job", {
        normalized_error_code: "calendar_connection_unavailable",
        requires_reauthorization: false,
        target_job_id: job.id,
        worker_id: workerId,
      });
      failed += 1;
      continue;
    }
    try {
      const token = await accessToken(connection);
      const eventId = googleEventId(job.appointment_id);
      if (job.operation === "upsert") {
        const { data: appointment, error: appointmentError } = await supabase
          .from("appointments")
          .select("id, starts_at, ends_at")
          .eq("id", job.appointment_id)
          .eq("organization_id", job.organization_id)
          .single();
        if (appointmentError) throw appointmentError;
        await upsertGoogleCalendarEvent(token, appointment);
      } else {
        await deleteGoogleCalendarEvent(token, eventId);
      }
      const { error } = await supabase.rpc("complete_calendar_sync_job", {
        google_event_id: eventId,
        target_job_id: job.id,
        worker_id: workerId,
      });
      if (error) throw error;
      succeeded += 1;
    } catch (error) {
      const normalized = providerError(error);
      await supabase.rpc("fail_calendar_sync_job", {
        normalized_error_code: normalized.code,
        requires_reauthorization: normalized.requiresReauthorization,
        target_job_id: job.id,
        worker_id: workerId,
      });
      failed += 1;
    }
  }

  let busyRefreshed = 0;
  for (const connection of connections) {
    if (
      !options?.connectionId &&
      connection.last_busy_sync_at &&
      Date.now() - new Date(connection.last_busy_sync_at).getTime() < 5 * 60_000
    ) {
      continue;
    }
    try {
      const token = await accessToken(connection);
      const periods = await getGoogleBusyPeriods(token, {
        timeMax: new Date(Date.now() + 90 * 24 * 60 * 60_000).toISOString(),
        timeMin: new Date().toISOString(),
      });
      const { error } = await supabase.rpc(
        "replace_google_calendar_busy_periods",
        {
          period_ends: periods.map((period) => period.end),
          period_starts: periods.map((period) => period.start),
          target_connection_id: connection.id,
        },
      );
      if (error) throw error;
      busyRefreshed += 1;
    } catch (error) {
      const normalized = providerError(error);
      await supabase.rpc("record_google_calendar_connection_error", {
        normalized_error_code: normalized.code,
        requires_reauthorization: normalized.requiresReauthorization,
        target_connection_id: connection.id,
      });
    }
  }

  return { busyRefreshed, claimed: jobs.length, failed, succeeded };
}
