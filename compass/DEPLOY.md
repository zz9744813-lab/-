# Deploy Compass v4

This deployment uses the v4 exoskeleton architecture: Compass is the UI and data layer; Hermes Agent is the model and tool-calling brain.

## Services

Recommended ports:

- Hermes API server: `127.0.0.1:8642`
- Compass web app: `0.0.0.0:3001`
- Compass MCP endpoint: `http://127.0.0.1:3001/api/mcp`

## Environment

Compass `.env` example:

```env
DATABASE_URL=file:./data/compass.db
HERMES_API_URL=http://127.0.0.1:8642
HERMES_API_KEY=<same-value-as-Hermes-API_SERVER_KEY>
HERMES_MODEL=hermes-agent
COMPASS_MCP_TOKEN=<random-token-shared-with-Hermes-config>
COMPASS_TIMEZONE=Asia/Shanghai
```

Optional reminder environment:

```env
COMPASS_REMINDER_EMAIL=<recipient@example.com>
SMTP_HOST=<smtp-host>
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<smtp-user>
SMTP_FROM=<from-address>
SMTP_PASS_FILE=/path/to/local/secret-file
```

## Hermes Config

Hermes should expose the API server and connect back to Compass MCP:

```yaml
platforms:
  api_server:
    enabled: true
    host: 127.0.0.1
    port: 8642

mcp_servers:
  compass:
    url: http://127.0.0.1:3001/api/mcp
    headers:
      Authorization: "Bearer ${COMPASS_MCP_TOKEN}"
```

`API_SERVER_KEY` should be injected through systemd or the process environment, not committed to git.

## Compass systemd Example

```ini
[Unit]
Description=Compass Personal Growth System
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/novelforge/compass
ExecStart=/opt/novelforge/compass/node_modules/.bin/next start -p 3001
Environment=NODE_ENV=production
Environment=HOSTNAME=0.0.0.0
Environment=PATH=/usr/bin:/usr/local/bin:/root/.local/bin:/usr/sbin:/usr/local/sbin:/sbin:/bin
Environment=DATABASE_URL=file:/opt/novelforge/compass/data/compass.db
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Use drop-ins for secrets:

```ini
[Service]
Environment=HERMES_API_URL=http://127.0.0.1:8642
Environment=HERMES_API_KEY=<token>
Environment=HERMES_MODEL=hermes-agent
Environment=COMPASS_MCP_TOKEN=<token>
```

## Build and Verify

```bash
pnpm install
pnpm build
systemctl restart compass.service
curl -s http://127.0.0.1:3001/api/health/brain
curl -s "http://127.0.0.1:3001/api/operations/recent?since=0"
```

If native modules fail with `Module did not self-register`, make sure the Node version used by systemd matches the Node version used for `pnpm install` / `pnpm rebuild`.

## Security

Never commit:

- `.env*`
- `data/*.db`
- SMTP passwords
- API tokens
- production logs containing request bodies or bearer tokens
