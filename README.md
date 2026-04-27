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
