import { describe, expect, it, vi } from "vitest";

import {
  GoogleCalendarProviderError,
  googleAuthorizationUrl,
  googleEventId,
  refreshGoogleAccessToken,
  upsertGoogleCalendarEvent,
} from "./google-api";

const env = {
  GOOGLE_CALENDAR_CLIENT_ID: "synthetic-client-id.apps.googleusercontent.com",
  GOOGLE_CALENDAR_CLIENT_SECRET: "synthetic-secret",
  GOOGLE_CALENDAR_REDIRECT_URI: "http://localhost:3000/callback",
  GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
};

describe("Google Calendar API boundary", () => {
  it("builds an offline authorization request with only the approved scopes", () => {
    const url = new URL(googleAuthorizationUrl(env, "csrf-state"));
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("csrf-state");
    expect(url.searchParams.get("scope")?.split(" ")).toEqual([
      "https://www.googleapis.com/auth/calendar.events.owned",
      "https://www.googleapis.com/auth/calendar.freebusy",
    ]);
  });

  it("creates a stable Google-compatible event ID", () => {
    const first = googleEventId("00000000-0000-0000-0000-000000000001");
    expect(first).toBe(googleEventId("00000000-0000-0000-0000-000000000001"));
    expect(first).toMatch(/^[0-9a-v]+$/);
  });

  it("exports only generic event content", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ id: "n360abcdef0123456789" }));
    await upsertGoogleCalendarEvent(
      "access-token",
      {
        ends_at: "2026-10-08T16:00:00.000Z",
        id: "00000000-0000-0000-0000-000000000001",
        starts_at: "2026-10-08T15:00:00.000Z",
      },
      fetcher,
    );
    const request = fetcher.mock.calls[1];
    const body = JSON.parse(String(request?.[1]?.body));
    expect(body.summary).toBe("Cita Nutri360");
    expect(JSON.stringify(body)).not.toMatch(
      /patient|paciente|email|phone|name/i,
    );
  });

  it("marks an invalid refresh grant as requiring reauthorization", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ error: "invalid_grant" }, { status: 400 }),
      );
    await expect(
      refreshGoogleAccessToken(env, "expired-token", fetcher),
    ).rejects.toMatchObject<Partial<GoogleCalendarProviderError>>({
      code: "google_reauthorization_required",
      requiresReauthorization: true,
    });
  });
});
