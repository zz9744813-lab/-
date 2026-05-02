# Hermes Bridge Fallback 故障排查

## 关键概念

- `/health` 可达只代表 bridge 进程正常，**不代表模型调用正常**
- HTTP 403 / error code: 1010 来自 fallback 上游，不是 Compass 前端
- 默认 fallback 是关闭的，Hermes 主链路失败会直接报错

## 常见错误

### "Hermes Bridge 错误：Hermes Python 主链路失败，fallback 未启用"

原因：AIAgent 调用失败，且 fallback 已关闭。

排查：
```bash
# 查看 bridge 日志
journalctl -u hermes-bridge -n 120 --no-pager

# 检查 Hermes 配置
cat ~/.hermes/config.yaml

# 测试 bridge diagnostics
curl http://127.0.0.1:8787/diagnostics

# 测试直接调用
curl -X POST http://127.0.0.1:8787/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"ping","context":{}}'
```

常见原因：
- `~/.hermes/config.yaml` 中 API key 过期或余额不足
- provider/base_url 配置错误
- 模型名不存在
- VPS IP 被 provider 封禁

### "Hermes Bridge 已连接，但 fallback 模型服务拒绝请求"

原因：fallback 启用，但上游返回 HTTP 403 / error code 1010。

排查：
```bash
# 检查 fallback 配置
curl http://127.0.0.1:8787/diagnostics

# 确认 fallback API key 有效
# 确认 fallback base_url 可达
# 确认 fallback model 存在
```

修复方案：
1. **关闭 fallback**（推荐）：修复 Hermes 主模型后，不需要 fallback
2. **修复 fallback 配置**：更换可用的 provider

## 立即修复命令

### 1. 关闭 fallback

```bash
sudo systemctl edit hermes-bridge
```

填入：
```ini
[Service]
Environment=HERMES_BRIDGE_ALLOW_DIRECT_FALLBACK=false
Environment=HERMES_BRIDGE_DIRECT_FOR_ATTACHMENTS=false
```

然后：
```bash
sudo systemctl daemon-reload
sudo systemctl restart hermes-bridge
```

### 2. 验证

```bash
# 检查 bridge 状态
systemctl status hermes-bridge --no-pager

# 检查 health
curl http://127.0.0.1:8787/health

# 检查 diagnostics（确认 fallbackEnabled=false）
curl http://127.0.0.1:8787/diagnostics

# 测试 chat
curl -X POST http://127.0.0.1:8787/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"ping","context":{}}'
```

## 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HERMES_BRIDGE_ALLOW_DIRECT_FALLBACK` | `false` | 是否允许主链路失败时使用 fallback |
| `HERMES_BRIDGE_DIRECT_FOR_ATTACHMENTS` | `false` | 是否对附件直接使用 fallback（不推荐） |
| `HERMES_BRIDGE_FALLBACK_BASE_URL` | `https://api.deepseek.com` | fallback 的 API 地址 |
| `HERMES_BRIDGE_FALLBACK_MODEL` | `deepseek-v4-flash` | fallback 模型名 |
| `HERMES_BRIDGE_FALLBACK_API_KEY` | 无 | fallback API key（在 runtime.env 中设置） |
| `HERMES_BRIDGE_TOKEN` | 无 | bridge 鉴权 token |

## 附件处理

Compass 在 Next.js API 层提取 docx/pdf/text 的文本摘要，放入 `context.attachments`。bridge 收到的是文本 excerpt，不是二进制文件。因此：

- 附件不需要走 fallback
- `HERMES_BRIDGE_DIRECT_FOR_ATTACHMENTS=false` 是正确的默认值
- 如果 docx 提取失败，Compass 会显示 warning，但仍会发送元数据给 bridge
