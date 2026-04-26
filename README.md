# 个人成长管理系统

一个可直接运行的本地 CLI 系统，帮助你管理：
- 长期目标（Goal）
- 日常习惯（Habit）
- 每日打卡（Check-in）
- 日/周复盘（Journal）
- 成长数据总览（Dashboard）

## 1. 快速开始

```bash
python3 growth_system.py init
```

初始化后会在当前目录创建 `growth.db`（SQLite 数据库）。

## 2. 核心功能

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

### 成长仪表盘

```bash
python3 growth_system.py dashboard
```

## 3. 建议使用节奏

- 每周一：新增/更新本周目标
- 每天：习惯打卡 + 1 条简短复盘
- 每周日：查看 dashboard，检查目标与习惯一致性

## 4. 后续可扩展方向

- 增加「目标拆解任务」模块
- 增加周报自动生成（导出 Markdown）
- 增加 Web 界面（Flask/FastAPI + 前端）
- 增加提醒能力（飞书/邮件/Telegram）
