# Deploy Compass on VPS

## Prerequisites
- Hermes Agent already running on the VPS, reachable at `http://127.0.0.1:8080`
- Node.js 20+ and pnpm installed
- A non-root user (e.g. `compass`) recommended for the systemd service

## Build

```bash
cd compass
pnpm install
pnpm db:migrate
pnpm build
```

`output: "standalone"` produces a self-contained bundle at `compass/.next/standalone/`.
**Important**: `next build` does NOT copy `public/` and `.next/static/` into the standalone folder — you must do that manually, or static assets won't load.

## Set up the deploy directory

```bash
sudo mkdir -p /opt/compass
sudo chown $USER:$USER /opt/compass

cp -r compass/.next/standalone/* /opt/compass/
cp -r compass/public /opt/compass/public
mkdir -p /opt/compass/.next
cp -r compass/.next/static /opt/compass/.next/static
mkdir -p /opt/compass/data
```

## systemd unit

Save as `/etc/systemd/system/compass.service`:

```ini
[Unit]
Description=Compass Next.js app
After=network.target

[Service]
Type=simple
User=compass
WorkingDirectory=/opt/compass
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOSTNAME=127.0.0.1
Environment=DATABASE_URL=file:/opt/compass/data/compass.db
Environment=BRAIN_PROVIDER=hermes-bridge
Environment=HERMES_BRIDGE_URL=http://127.0.0.1:8787
Environment=HERMES_BRIDGE_TOKEN=replace-me-with-openssl-rand-hex-32
Environment=HERMES_TOKEN=replace-me-with-openssl-rand-hex-32

MemoryMax=400M
MemoryHigh=300M

Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now compass
```

## Why these settings

- **PORT=3001** — port 3000 is already taken by novel-hub on this VPS.
- **HOSTNAME=127.0.0.1** — bind to loopback only. External access via Tailscale or Caddy.
- **MemoryMax=400M** — on a 1 GB RAM VPS where Hermes already eats ~370 MB, this prevents Compass from OOM-killing Hermes.

## Expose Compass

### Tailscale (recommended)
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
Access from any device on your tailnet at `http://<vps-tailnet-ip>:3001`.

### Caddy (if you need a public domain)
```caddyfile
compass.yourdomain.com {
    reverse_proxy 127.0.0.1:3001
    basic_auth {
        you JDJhJDE0...
    }
}
```

## Backups

```bash
DATE=$(date +%Y%m%d-%H%M)
sqlite3 /opt/compass/data/compass.db ".backup /tmp/compass-$DATE.db"
```
Add to crontab and push to B2/R2/NAS via rclone.


## Brain provider env (recommended)

```env
BRAIN_PROVIDER=hermes-bridge
HERMES_BRIDGE_URL=http://127.0.0.1:8787
HERMES_BRIDGE_TOKEN=replace-me

# Fallback mode only
# BRAIN_PROVIDER=openai-compatible
# AI_BASE_URL=https://api.openai.com/v1
# AI_API_KEY=...
# AI_MODEL=gpt-4o-mini
```

默认建议保持 `BRAIN_PROVIDER=disabled` 或 `hermes-bridge`，不要优先使用 `HERMES_API_URL`。
