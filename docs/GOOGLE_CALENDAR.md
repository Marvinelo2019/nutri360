# Google Calendar setup

Nutri360 can synchronize each owner or nutritionist with their own primary Google Calendar. Nutri360 remains the source of truth: Google receives generic appointment events, while Google contributes only busy time ranges. Patient identity, contact information, notes, and clinical data are never sent to or read from Google.

## Google Cloud configuration

1. Create or select a Google Cloud project.
2. Enable the Google Calendar API.
3. Configure the OAuth consent screen. During development, keep the application in testing mode and add only the synthetic test account as a test user.
4. Create an OAuth client with application type **Web application**.
5. Add the exact authorized redirect URI:
   - Local: `http://localhost:3000/api/integrations/google-calendar/callback`
   - Production: `https://YOUR_DOMAIN/api/integrations/google-calendar/callback`
6. Store the client ID and client secret only in the server environment. Never download credentials into this repository.

Nutri360 requests only:

- `calendar.events.owned` to create, update, and remove its generic events on calendars owned by the professional.
- `calendar.freebusy` to read occupied time ranges without retrieving event titles, descriptions, or attendees.

Google may show an unverified-app warning while the OAuth application remains in testing mode. Public production use can require Google's OAuth verification process.

## Server environment

Generate an independent 32-byte encryption key:

```bash
openssl rand -base64 32
```

Configure these server-only variables:

```dotenv
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/integrations/google-calendar/callback
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
```

The refresh token is encrypted with AES-256-GCM before it is stored. Changing the encryption key without a migration requires every professional to reconnect their Google account.

## Worker schedule

Call the worker approximately every five minutes:

```bash
curl --fail --request POST \
  --header "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR_DOMAIN/api/jobs/google-calendar
```

The endpoint uses leased jobs, deterministic Google event IDs, bounded retries, and sanitized error codes. Appointment creation never waits for Google.

In local development, queued changes are processed with **Sincronizar ahora**. Automatic processing begins only after the deployment platform schedules this endpoint, recommended approximately every five minutes.

## Synthetic validation

1. Sign in as an owner or nutritionist and open **Agenda → Reservas públicas**.
2. Select **Conectar Google Calendar** and grant access with the test Google account.
3. Confirm that availability and event synchronization timestamps appear without exposing the refresh token.
4. Create a synthetic future appointment and select **Sincronizar ahora**.
5. Confirm that Google contains one private event named `Cita Nutri360`, with the correct time and no patient information.
6. Repeat synchronization and confirm there is still only one Google event.
7. Cancel the appointment in Nutri360, synchronize, and confirm the Google event is removed.
8. Create a private Google event inside a configured booking window, synchronize, and confirm the overlapping public slot is no longer offered.
9. Disconnect the integration and confirm the encrypted local credential and pending jobs are removed. Existing Nutri360 appointments remain unchanged.

Use only synthetic patients and a dedicated test Google account during validation.

## Official references

- [Google OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Calendar authorization scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Google Calendar event creation](https://developers.google.com/workspace/calendar/api/guides/create-events)
- [Google Calendar API usage limits](https://developers.google.com/workspace/calendar/api/guides/quota)
