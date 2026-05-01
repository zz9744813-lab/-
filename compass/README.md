# Compass

Next.js app for Compass and Hermes.

## Local Development

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:3001`.

## Notes

- Compass is the UI and local data layer.
- Hermes is the AI brain.
- AI flows route through Hermes APIs/MCP.

## Schedule Email Reminders

Compass can send email reminders for schedule items that have `reminderEmail`
set, or to `COMPASS_REMINDER_EMAIL` as a fallback.

Run the reminder endpoint every minute:

```bash
curl -fsS -H "Authorization: Bearer $REMINDER_CRON_TOKEN" \
  http://127.0.0.1:3001/api/reminders/schedule
```

If `REMINDER_CRON_TOKEN` is empty, the endpoint falls back to `HERMES_TOKEN`.
Email delivery uses SMTP when `SMTP_HOST` is configured; otherwise it tries
`/usr/sbin/sendmail`.

For Linux deployments, copy the examples in `deploy/` to systemd units and put
the token in `/etc/compass/reminders.env`:

```bash
REMINDER_CRON_TOKEN=your-token
```
