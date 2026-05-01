# Compass × Hermes

A local-first, design-forward personal growth dashboard whose brain is a self-hosted Hermes Agent.

> **Architecture**: Compass is the body (data + UI), Hermes is the brain (reasoning + memory + scheduling), and they talk over MCP.

---

## Overview

Compass is a single-user personal growth OS that runs on your own VPS. It tracks six dimensions of your life — goals, habits, mood, knowledge, finance, and time — and surfaces them through a fast, keyboard-first dashboard.

What makes it different from Notion templates: it doesn't have its own AI brain. Instead, it integrates deeply with Hermes Agent via MCP, so the same brain that talks to you on chat clients can read your Compass data, generate weekly reviews, and surface insights it learns over time.

## Status

Active development. See `compass-spec-v2.md` for the full product + technical specification.

**Phase 1 shipped** (foundation):
- Next.js App Router scaffold
- Dark design tokens + Geist Sans / Fraunces / Geist Mono fonts
- Sidebar layout + all six routes wired
- Navigate-only Cmd+K palette
- Quick capture with `C` shortcut writing to `captures` table
- Inbox page listing captures

**Next up — Phase 2** (Hermes integration):
- Provider-based brain client (disabled/hermes-bridge)
- MCP server exposing Compass data
- Brain page provider-aware chat MVP

## Stack

```
Framework:     Next.js 14 (App Router, RSC)
Language:      TypeScript (strict)
Styling:       Tailwind + CSS variables
DB:            SQLite via better-sqlite3
ORM:           Drizzle
AI:            Provider-based brain config (disabled / hermes-bridge)
MCP:           @modelcontextprotocol/sdk
```

## Run locally

```bash
cd compass
pnpm install
pnpm db:migrate
pnpm dev      # opens at http://localhost:3001
```

## Brain configuration

Compass 使用 provider-based 大脑配置：

- `BRAIN_PROVIDER=disabled`（默认，可离线独立使用）
- `BRAIN_PROVIDER=hermes-bridge`（推荐，走本机 Hermes Bridge）

Compass 不再直接配置底层 LLM provider/model。DeepSeek / OpenRouter / NVIDIA / SiliconFlow 等模型应统一配置在 Hermes 侧（`~/.hermes/config.yaml`、`~/.hermes/runtime.env`），这样 Web、gateway、定时任务可以共用同一个大脑配置。

对应环境变量见 `compass/.env.example`。

## Deploy on VPS

See `DEPLOY.md` for the full deployment guide. Short version:

1. Hermes Agent already running on the VPS (port 8080, internal)
2. Build Compass with `output: 'standalone'`:
   ```bash
   cd compass && pnpm build
   ```
3. Run via systemd (no Docker — saves ~150 MB on a 1 GB VPS):
   ```bash
   sudo systemctl enable --now compass
   ```
4. Expose via Tailscale (recommended) or Caddy + Basic Auth.

Compass listens on **port 3001** to avoid conflict with other services.

## Project structure

```
compass/
├── app/
│   ├── (app)/                    # authenticated app routes
│   │   ├── dashboard/
│   │   ├── goals/
│   │   ├── habits/
│   │   ├── journal/
│   │   ├── knowledge/
│   │   ├── finance/
│   │   ├── brain/                # Hermes view
│   │   ├── reviews/
│   │   └── inbox/
│   └── api/
│       ├── capture/              # POST: hand off to Hermes
│       ├── hermes/webhook/       # POST: receive events from Hermes
│       └── mcp/                  # MCP server endpoint
├── components/
├── lib/
│   ├── db/schema.ts
│   ├── hermes/client.ts          # HTTP client to Hermes
│   └── mcp/                      # MCP tools
└── drizzle/                      # migrations
```

## Legacy: Python + Streamlit prototype

An earlier prototype using Python + Streamlit lives in the `legacy/` directory. It's preserved for reference but not maintained. Use Compass going forward.

## License

MIT
