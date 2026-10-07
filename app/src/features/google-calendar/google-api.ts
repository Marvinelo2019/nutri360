import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import type { GoogleCalendarEnv } from "@/lib/env/server";

export const googleCalendarScopes = [
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar.freebusy",
] as const;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().optional(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

const eventResponseSchema = z.object({ id: z.string().min(5) });
const freeBusyResponseSchema = z.object({
  calendars: z.record(
    z.string(),
    z.object({
      busy: z.array(
        z.object({
          start: z.iso.datetime({ offset: true }),
          end: z.iso.datetime({ offset: true }),
        }),
      ),
    }),
  ),
});

export class GoogleCalendarProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly requiresReauthorization = false,
  ) {
    super(code);
  }
}

type Fetcher = typeof fetch;

export function googleAuthorizationUrl(env: GoogleCalendarEnv, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    access_type: "offline",
    client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: env.GOOGLE_CALENDAR_REDIRECT_URI,
    response_type: "code",
    scope: googleCalendarScopes.join(" "),
    state,
  }).toString();
  return url.toString();
}

async function tokenRequest(body: URLSearchParams, fetcher: Fetcher) {
  let response: Response;
  try {
    response = await fetcher("https://oauth2.googleapis.com/token", {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
  } catch {
    throw new GoogleCalendarProviderError("google_unavailable");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const invalidGrant =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      payload.error === "invalid_grant";
    throw new GoogleCalendarProviderError(
      invalidGrant ? "google_reauthorization_required" : "google_token_failed",
      invalidGrant,
    );
  }
  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new GoogleCalendarProviderError("google_invalid_response");
  }
  return parsed.data;
}

export function exchangeGoogleAuthorizationCode(
  env: GoogleCalendarEnv,
  code: string,
  fetcher: Fetcher = fetch,
) {
  return tokenRequest(
    new URLSearchParams({
      client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.GOOGLE_CALENDAR_REDIRECT_URI,
    }),
    fetcher,
  );
}

export function refreshGoogleAccessToken(
  env: GoogleCalendarEnv,
  refreshToken: string,
  fetcher: Fetcher = fetch,
) {
  return tokenRequest(
    new URLSearchParams({
      client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    fetcher,
  );
}

export function googleEventId(appointmentId: string) {
  return `n360${createHash("sha256").update(appointmentId).digest("hex")}`;
}

function eventBody(eventId: string, startsAt: string, endsAt: string) {
  return {
    end: { dateTime: endsAt, timeZone: "America/Guatemala" },
    id: eventId,
    start: { dateTime: startsAt, timeZone: "America/Guatemala" },
    summary: "Cita Nutri360",
    transparency: "opaque",
    visibility: "private",
  };
}

async function calendarFetch(
  url: string,
  accessToken: string,
  init: RequestInit,
  fetcher: Fetcher,
) {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new GoogleCalendarProviderError("google_unavailable");
  }
  if (response.status === 401 || response.status === 403) {
    throw new GoogleCalendarProviderError(
      "google_reauthorization_required",
      true,
    );
  }
  if (response.status === 429) {
    throw new GoogleCalendarProviderError("google_rate_limited");
  }
  if (response.status >= 500) {
    throw new GoogleCalendarProviderError("google_unavailable");
  }
  return response;
}

export async function upsertGoogleCalendarEvent(
  accessToken: string,
  appointment: { id: string; starts_at: string; ends_at: string },
  fetcher: Fetcher = fetch,
) {
  const eventId = googleEventId(appointment.id);
  const base =
    "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const body = JSON.stringify(
    eventBody(eventId, appointment.starts_at, appointment.ends_at),
  );
  const updated = await calendarFetch(
    `${base}/${eventId}?sendUpdates=none`,
    accessToken,
    { body, method: "PUT" },
    fetcher,
  );
  if (updated.ok) {
    const parsed = eventResponseSchema.safeParse(await updated.json());
    if (!parsed.success) {
      throw new GoogleCalendarProviderError("google_invalid_response");
    }
    return parsed.data.id;
  }
  if (updated.status !== 404) {
    throw new GoogleCalendarProviderError("google_event_write_failed");
  }
  const inserted = await calendarFetch(
    `${base}?sendUpdates=none`,
    accessToken,
    { body, method: "POST" },
    fetcher,
  );
  if (!inserted.ok) {
    throw new GoogleCalendarProviderError("google_event_write_failed");
  }
  const parsed = eventResponseSchema.safeParse(await inserted.json());
  if (!parsed.success) {
    throw new GoogleCalendarProviderError("google_invalid_response");
  }
  return parsed.data.id;
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  fetcher: Fetcher = fetch,
) {
  const response = await calendarFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=none`,
    accessToken,
    { method: "DELETE" },
    fetcher,
  );
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new GoogleCalendarProviderError("google_event_delete_failed");
  }
}

export async function getGoogleBusyPeriods(
  accessToken: string,
  range: { timeMin: string; timeMax: string },
  fetcher: Fetcher = fetch,
) {
  const response = await calendarFetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    accessToken,
    {
      body: JSON.stringify({
        items: [{ id: "primary" }],
        timeMax: range.timeMax,
        timeMin: range.timeMin,
        timeZone: "America/Guatemala",
      }),
      method: "POST",
    },
    fetcher,
  );
  if (!response.ok) {
    throw new GoogleCalendarProviderError("google_freebusy_failed");
  }
  const parsed = freeBusyResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new GoogleCalendarProviderError("google_invalid_response");
  }
  return Object.values(parsed.data.calendars).flatMap(
    (calendar) => calendar.busy,
  );
}

export async function revokeGoogleToken(
  token: string,
  fetcher: Fetcher = fetch,
) {
  try {
    await fetcher(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      {
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      },
    );
  } catch {
    // Local disconnect must still remove the stored credential.
  }
}
