# Hermes Bridge

`hermes-bridge` 是 Compass 与 Hermes 之间的本地桥接服务（FastAPI）。

## 目标
- 对 Compass 提供稳定的本地 HTTP 接口：`/health`、`/chat`
- 通过 Hermes Python `AIAgent` 执行对话
- 默认仅监听 `127.0.0.1`，不暴露公网

## 运行前提
如果你希望真正调用 Hermes 的大脑能力，`hermes-bridge` 必须运行在 **可导入 Hermes AIAgent 的 Python 环境**（即 Hermes 安装环境）中。

## 环境变量
- `HOST`：默认 `127.0.0.1`
- `PORT`：默认 `8787`
- `HERMES_BRIDGE_TOKEN`：可选，配置后必须带 Bearer Token 才能访问 `/chat`
- `HERMES_BRIDGE_TIMEOUT_SECONDS`：调用超时，默认 `45`
- `HERMES_BRIDGE_SKIP_MEMORY`：`true/false`，默认 `false`
- `HERMES_BRIDGE_SKIP_CONTEXT_FILES`：`true/false`，默认 `false`

## 本地启动
```bash
cd hermes-bridge
python3 -m pip install -r requirements.txt
python3 -m uvicorn app:app --host 127.0.0.1 --port 8787
```

## API
### GET /health
```json
{
  "ok": true,
  "service": "hermes-bridge"
}
```

### POST /chat
请求：
```json
{
  "message": "用户问题",
  "context": {}
}
```

响应：
```json
{
  "ok": true,
  "response": "Hermes 回复",
  "provider": "hermes-python"
}
```

## 生产部署（systemd）

`hermes-bridge` 必须 import `run_agent.AIAgent`，因此 **必须用 Hermes 安装时的 venv 启动**，不能用系统 `python3`。

```bash
# 1. 同步代码到 VPS（任选一个：rsync / git pull）
rsync -av hermes-bridge/ root@your-vps:/opt/dash-repo/hermes-bridge/

# 2. 按你的实际路径编辑 unit 文件
cp /opt/dash-repo/hermes-bridge/systemd/hermes-bridge.service.example \
   /etc/systemd/system/hermes-bridge.service
$EDITOR /etc/systemd/system/hermes-bridge.service
#   - WorkingDirectory   指向 hermes-bridge 源码目录
#   - PYTHONPATH         指向 hermes-agent 源码根目录（含 run_agent.py）
#   - ExecStart          指向 hermes venv 内的 python
#   - HERMES_BRIDGE_TOKEN 可选，若配置后 Compass 也要填同一个值

# 3. 启动并设为开机自启
systemctl daemon-reload
systemctl enable --now hermes-bridge
systemctl status hermes-bridge --no-pager

# 4. 验证
curl -s http://127.0.0.1:8787/health
# 期望：{"ok":true,"service":"hermes-bridge"}
```

## 与 Compass 的接入

Compass 端只需要在设置页填两件事：

| 字段 | 取值 |
|---|---|
| Hermes Bridge URL | `http://127.0.0.1:8787`（如果同机器部署） |
| Hermes Bridge Token | 与 systemd unit 中 `HERMES_BRIDGE_TOKEN` 一致；留空则不鉴权 |

模型(DeepSeek/OpenRouter/API Key) **不再** 在 Compass 配置 —— 完全由 Hermes 自己管理。
