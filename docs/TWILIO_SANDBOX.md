# Twilio WhatsApp Sandbox

This integration is for local, non-production validation only. It sends Twilio's pre-approved Appointment Reminder template to one explicitly configured test number. It must not be used for ordinary patients.

## Create and join the Sandbox

1. Create or sign in to a Twilio trial account.
2. In the Twilio Console, open **Messaging → Try it out → Send a WhatsApp message**.
3. Scan the QR code or send the displayed `join <sandbox code>` message from the single phone that will receive tests.
4. Keep the Sandbox sender and test recipient in E.164 format. Guatemala numbers use `+502` followed by eight digits.

Twilio documents that the Sandbox requires each recipient to join, is not for production, and includes a pre-approved Appointment Reminder template: <https://www.twilio.com/docs/whatsapp/sandbox>.

## Configure Nutri360

Never paste credentials into chat or commit them. Add these values only to `app/.env.local`:

```dotenv
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_SANDBOX_RECIPIENT=+502XXXXXXXX
TWILIO_SANDBOX_ORGANIZATION_ID=00000000-0000-0000-0000-000000000000
TWILIO_APPOINTMENT_CONTENT_SID=HXb5b62575e6e4ff6129ad7c8efe1f983e
```

- Copy the Account SID and Auth Token from the Twilio Console.
- Use the sender displayed by Twilio if it differs from the example.
- `TWILIO_SANDBOX_RECIPIENT` must be the same phone that joined the Sandbox.
- `TWILIO_SANDBOX_ORGANIZATION_ID` must be the current Nutri360 organization UUID.
- The content SID is Twilio's documented Sandbox Appointment Reminder template; do not replace it with a custom template in Sandbox.

Restart `npm run dev` after changing environment variables.

## Send the controlled test

1. In Nutri360, select **WhatsApp** under **Agenda → Recordatorios**.
2. Create or use a test patient whose phone exactly matches `TWILIO_SANDBOX_RECIPIENT`.
3. Create a future appointment for that test patient so its confirmation is due immediately.
4. Return to **Agenda → Recordatorios** and press **Enviar un recordatorio de prueba**.

Nutri360 processes at most one due job per press. The message contains only the appointment date and time. Other patient numbers cannot be claimed by the Sandbox worker.

## Limitations

- A Sandbox join expires after three days and must then be repeated.
- Custom Spanish WhatsApp templates require a registered production sender.
- Twilio accepting a message means it entered Twilio's delivery queue; this increment does not yet process signed delivery-status callbacks.
- Production requires explicit patient channel consent, a registered sender, approved templates, and signature-verified webhooks.
