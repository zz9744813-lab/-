# Compass × Hermes 集成架构说明

本文档描述 Compass 与 Hermes 的目标架构，以及 Brain-Bridge 阶段后的职责边界。

## 1) 模型后端定位

DeepSeek / OpenRouter 等模型应优先配置在 Hermes 侧，作为 Hermes 的 provider。

原因：
- Hermes 负责统一记忆、技能、工具调用链路。
- Compass 不需要关心底层模型切换。
- 后续多入口（Web、Telegram、Cron）可复用同一大脑能力。

## 2) hermes-bridge 的作用

`hermes-bridge` 是本机 FastAPI 桥接服务：
- Compass 发起问题到 `hermes-bridge`。
- `hermes-bridge` 在 Hermes Python 环境中调用 `AIAgent`。
- 桥接层可做鉴权、超时、错误兜底。

## 3) Compass MCP Server 的作用

Compass 提供 MCP server（`/api/mcp`），让 Hermes 能读写 Compass 的结构化数据。

因此关系是：
- Compass -> hermes-bridge -> Hermes（提问链路）
- Hermes -> Compass MCP tools（读写链路）

## 4) Compass 核心功能必须独立可用

即使 Hermes 不可用，Compass 也应保持以下能力：
- 目标管理
- 习惯打卡
- 日记记录
- Dashboard 指标展示
- Inbox 管理

也就是 `BRAIN_PROVIDER=disabled` 仍应是可运行模式。

## 5) Hermes 的角色边界

Hermes 是增强大脑，不是：
- 业务数据库
- Compass 的唯一调度器
- 前端页面的数据源替代品

Compass 依然维护自身 SQLite 作为主业务数据源。

## 6) 下一阶段 MCP tools 规划

下一阶段建议优先新增以下工具（命名先按 snake_case 协议）：

- `compass_get_today_status`
- `compass_list_goals`
- `compass_create_goal`
- `compass_list_habits`
- `compass_mark_habit_done`
- `compass_create_journal_entry`
- `compass_get_japanese_progress`
- `compass_save_review`

这些工具完成后，Hermes 可以更稳定地执行周报、提醒、复盘与跨维度分析。
