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

模型（DeepSeek/OpenRouter/NVIDIA/SiliconFlow 等）的 provider、API Key、模型名 **不再** 在 Compass 配置。Compass 只负责把消息转发给 bridge。

## Provider 配置最佳实践

Hermes 的 gateway（Discord/Telegram/邮件等）和 hermes-bridge（Web）是**两个独立的 systemd 服务**。它们都需要能拿到 provider key,否则会出现 **"Web 能聊但 Discord 报 no API key"** 这类 split-brain bug(已经踩过坑)。

bridge 内部有 **两条调用路径**:

```
Compass → bridge → ① Hermes AIAgent (走 ~/.hermes/config.yaml,和 Discord 共用)
                  └─ 失败时 → ② direct fallback (HERMES_BRIDGE_FALLBACK_* env 直连 OpenAI 兼容 API)
```

为了避免 split-brain,推荐这套组合:

### 1. `~/.hermes/config.yaml` —— 主路径(Hermes AIAgent)

```yaml
model:
  provider: custom                        # custom = 通用 OpenAI 兼容协议
  base_url: https://integrate.api.nvidia.com/v1
  default: moonshotai/kimi-k2-instruct    # 在 build.nvidia.com 上的实际 model id
  api_key: nvapi-...                      # 直接写到 yaml 里(yaml 在 /root 下,不进 git)
fallback_model:
  provider: custom
  base_url: https://api.siliconflow.cn
  model: deepseek-ai/DeepSeek-V3.2
  api_key: sk-...
```

`hermes config set` 命令可以代替手动编辑:
```bash
hermes config set model.provider custom
hermes config set model.base_url https://integrate.api.nvidia.com/v1
hermes config set model.default moonshotai/kimi-k2-instruct
hermes config set model.api_key 'nvapi-...'
hermes config set fallback_model.api_key 'sk-...'
```

### 2. `~/.hermes/runtime.env` —— API Keys 单一来源

bridge 和 gateway 都 `EnvironmentFile=-/root/.hermes/runtime.env`,这里改一处两边生效。
**不进 git,文件权限 600**:

```bash
NVIDIA_API_KEY=nvapi-...
SILICONFLOW_API_KEY=sk-...

# bridge 的 direct-fallback 直接用这把 key(通常等于 SiliconFlow,作为最后一道兜底)
HERMES_BRIDGE_FALLBACK_API_KEY=sk-...
```

### 3. `hermes-bridge.service` —— 只放 bridge 自己的设定

URL 和 model 名可以写,API key **不要** 写。例子见 `systemd/hermes-bridge.service.example`,关键两行:

```ini
EnvironmentFile=-/root/.hermes/runtime.env
Environment=HERMES_BRIDGE_FALLBACK_BASE_URL=https://api.siliconflow.cn/v1
Environment=HERMES_BRIDGE_FALLBACK_MODEL=deepseek-ai/DeepSeek-V3.2
```

### 改完后两个服务都要重启

```bash
systemctl daemon-reload
systemctl restart hermes-gateway hermes-bridge
systemctl status hermes-gateway hermes-bridge --no-pager | head -20

# 自检
curl -s http://127.0.0.1:8787/health
curl -s -X POST http://127.0.0.1:8787/chat \
     -H 'Content-Type: application/json' \
     -d '{"message":"自报家门:你正在用什么模型?","context":{}}'
```
