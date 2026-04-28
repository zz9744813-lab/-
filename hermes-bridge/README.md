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
