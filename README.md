# Compass × Hermes

A local-first, design-forward personal growth dashboard whose brain is a self-hosted Hermes Agent.

> **Architecture**: Compass is the body (data + UI), Hermes is the brain (reasoning + memory + scheduling), and they talk over MCP.

---

## Overview

Compass is a single-user personal growth OS that runs on your own VPS. It tracks six dimensions of your life — goals, habits, mood, knowledge, finance, and time — and surfaces them through a fast, keyboard-first dashboard.

What makes it different from Notion templates: it doesn't have its own AI brain. Instead, it integrates deeply with [Hermes Agent](https://github.com/NousResearch/hermes-agent) via MCP, so the same brain that talks to you on Telegram can read your Compass data, generate weekly reviews, and surface insights it learns over time.

## Status

🚧 Active development. See `compass-spec-v2.md` for the full product + technical specification.

**Phase 1 shipped** (foundation):
- Next.js App Router scaffold
- Dark design tokens + Geist Sans / Fraunces / Geist Mono fonts
- Sidebar layout + all six routes wired
- Navigate-only Cmd+K palette
- Quick capture with `C` shortcut writing to `captures` table
- Inbox page listing captures

**Next up — Phase 2** (Hermes integration):
- HTTP client to Hermes
- MCP server exposing Compass data
- Quick Capture routed through Hermes for auto-classification
- Brain page MVP (live chat with Hermes)

## Stack

```
Framework:     Next.js 14 (App Router, RSC)
Language:      TypeScript (strict)
Styling:       Tailwind + CSS variables
DB:            SQLite via better-sqlite3
ORM:           Drizzle
AI:            All inference goes through Hermes (no direct LLM SDK)
MCP:           @modelcontextprotocol/sdk
```

## Run locally

```bash
cd compass
pnpm install
pnpm db:migrate
pnpm dev      # opens at http://localhost:3001
```

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
│   │   ├── brain/                # ★ Hermes view
│   │   ├── reviews/
│   │   └── inbox/
│   └── api/
│       ├── capture/              # POST: hand off to Hermes
│       ├── hermes/webhook/       # POST: receive events from Hermes
│       └── mcp/                  # MCP server endpoint
├── components/
│   ├── layout/sidebar.tsx
│   ├── command/command-palette.tsx
│   ├── capture/quick-capture.tsx
│   └── ...
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
# 个人成长管理系统

这是一个「CLI + Web 可视化」双模式的个人成长管理系统：
- CLI 适合快速记录与自动化脚本
- Streamlit Web 适合日常查看与交互操作
- 底层统一使用 SQLite（`growth.db`），两种模式共享同一份数据

## 功能清单

- 🎯 目标列表（新增 / 查看）
- 🏃 习惯列表（新增 / 查看）
- ✅ 今日打卡（按习惯记录）
- 📝 日记记录（心情、亮点、教训、下一步）
- 📊 Dashboard 汇总（目标、习惯、打卡、最新复盘）

---

## 1) 安装依赖

```bash
python3 -m pip install streamlit
```

> SQLite 使用 Python 标准库，无需额外安装。

## 2) CLI 模式（保留）

### 初始化数据库

```bash
python3 growth_system.py init
```

### 目标管理

```bash
python3 growth_system.py add-goal "3个月读完12本书" --category 学习 --target-date 2026-07-31
python3 growth_system.py list-goals
```

### 习惯管理

```bash
python3 growth_system.py add-habit "晨跑30分钟" --frequency daily --goal-id 1
```

### 习惯打卡

```bash
python3 growth_system.py checkin 1 --note "状态不错"
```

### 每日复盘

```bash
python3 growth_system.py journal --mood 4 --wins "坚持早起" --lessons "刷短视频过久" --next-actions "22:30后不看手机"
```

### CLI 仪表盘

```bash
python3 growth_system.py dashboard
```

---

## 3) Web 可视化模式（Streamlit）

### 本地启动预览

```bash
streamlit run streamlit_app.py
```

启动后浏览器打开地址（默认）：

```text
http://localhost:8501
```

### 页面说明

- **目标**：新增目标 + 查看目标表格
- **习惯**：新增习惯（可关联目标）+ 查看习惯表格
- **打卡&日记**：记录今日打卡、查看今日记录、填写日记
- **Dashboard**：查看汇总指标与最新复盘

---

## 4) 建议使用节奏

- 每周一：更新本周目标
- 每天：完成打卡 + 写 1 条简短日记
- 每周日：看 Dashboard，评估执行与调整策略

## 5) 后续可扩展方向

- 目标拆解任务（Milestone / Todo）
- 周报自动导出 Markdown/PDF
- 提醒通知（邮件 / 飞书 / Telegram）
- 多用户支持与账号体系
