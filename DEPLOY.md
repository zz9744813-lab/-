# Deploy Compass on VPS

## Prerequisites
- Hermes Agent running and reachable from Compass (`HERMES_API_URL`)
- Node.js 20+ and pnpm installed
- SQLite data directory available

## Build

```bash
cd compass
pnpm install
pnpm build
```

The project is configured for standalone output.

## Run (systemd suggested)

Example service unit:

```ini
[Unit]
Description=Compass Next.js app
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/compass/compass
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=DATABASE_URL=file:/opt/compass/data/compass.db
Environment=HERMES_API_URL=http://127.0.0.1:8080
Environment=HERMES_TOKEN=replace-me
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now compass
```
