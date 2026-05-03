# Compass - Hermes Agent Personal Growth OS Exoskeleton

Compass is the personal growth OS exoskeleton for Hermes Agent. Hermes is the brain: model routing, memory, skills, and agent behavior. Compass is the body: UI, SQLite, and domain models for schedule, goals, plans, finance, journal, captures, coach workflows, and operations traces.

## Architecture

```text
Browser -> Compass UI -> Hermes (/v1/chat/completions, stream)
                         |
                         | MCP tool calls
                         v
                       Compass MCP server -> SQLite
```

Key properties:

- LLM API keys live only in Hermes config. Compass does not store model provider keys.
- Chat streaming is served by Hermes' OpenAI-compatible API server.
- Data writes happen through Compass MCP tools and are logged in `brain_runs` / `brain_actions`.
- Compass exposes real app state through SQLite-backed pages, APIs, and operations traces.

## Deployment

### Requirements

- Node.js 20+ and pnpm
- Python 3.11+ for Hermes Agent
- SQLite 3
- Optional: Tailscale or a reverse proxy for private multi-device access

### Hermes

Install Hermes Agent using the upstream documentation:

- https://github.com/NousResearch/hermes-agent

Configure Hermes in `~/.hermes/config.yaml`:

```yaml
model:
  default: <model-id>
  provider: <provider-name>

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

Start Hermes with an API server token:

```bash
API_SERVER_KEY=<your-token> hermes gateway run --replace
```

### Compass

Create `.env`:

```env
DATABASE_URL=file:./data/compass.db
HERMES_API_URL=http://127.0.0.1:8642
HERMES_API_KEY=<same-value-as-Hermes-API_SERVER_KEY>
HERMES_MODEL=hermes-agent
COMPASS_MCP_TOKEN=<same-value-as-Hermes-mcp-server-bearer-token>
COMPASS_TIMEZONE=Asia/Shanghai
```

Install, migrate, build, and run:

```bash
pnpm install
pnpm db:migrate
pnpm build
pnpm start
```

For production, run Compass under systemd and keep its PATH pinned to the Node version used to build native modules such as `better-sqlite3`.

## Runtime Checks

```bash
curl -s http://127.0.0.1:3001/api/health/brain
curl -s -X POST http://127.0.0.1:3001/api/mcp   -H "Authorization: Bearer <COMPASS_MCP_TOKEN>"   -H "Content-Type: application/json"   -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Data Migration

Before upgrading from older versions, back up the database:

```bash
bash scripts/backup-before-migration.sh
pnpm db:migrate
```

## Modules

- Schedule: tasks, reminders, and time-aware entries
- Goals: long-term and short-term progress tracking
- Plans: long plans, phase review, and task materialization
- Journal: text plus mood, energy, motivation, and tags
- Finance: income and expense records
- Inbox captures: quick ideas and raw notes
- Coach: weekly/monthly reviews, reflections, and trend memory
- Operations: full trace of Hermes calls and MCP tool execution

## Email Reminders

Compass can send schedule reminders by SMTP. Use a local secrets file or systemd environment file for SMTP credentials; never commit them.

Example cron call:

```bash
curl -fsS -H "Authorization: Bearer <REMINDER_CRON_TOKEN>"   http://127.0.0.1:3001/api/reminders/schedule
```
