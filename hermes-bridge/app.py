import asyncio
import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field


app = FastAPI(title="hermes-bridge")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    context: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    ok: bool
    response: str
    provider: str


def parse_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def require_token(authorization: str | None) -> None:
    expected = os.getenv("HERMES_BRIDGE_TOKEN", "").strip()
    if not expected:
        return
    expected_header = f"Bearer {expected}"
    if authorization != expected_header:
        raise HTTPException(status_code=401, detail="未授权：bridge token 校验失败")


def build_agent() -> Any:
    try:
        from run_agent import AIAgent
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            "无法导入 Hermes AIAgent，请确认 hermes-bridge 运行在 Hermes 安装环境中。"
        ) from exc

    skip_memory = parse_bool_env("HERMES_BRIDGE_SKIP_MEMORY", False)
    skip_context_files = parse_bool_env("HERMES_BRIDGE_SKIP_CONTEXT_FILES", False)

    return AIAgent(
        quiet_mode=True,
        skip_memory=skip_memory,
        skip_context_files=skip_context_files,
    )


def run_agent_sync(message: str, context: dict[str, Any]) -> str:
    agent = build_agent()

    prompt = message
    if context:
        prompt = f"{message}\n\n[context]\n{context}"

    # 兼容不同版本 Hermes Python API
    for method_name in ("run", "chat", "respond"):
        method = getattr(agent, method_name, None)
        if callable(method):
            result = method(prompt)
            if isinstance(result, str):
                return result
            return str(result)

    raise RuntimeError("Hermes AIAgent 不包含可用的 run/chat/respond 方法")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "hermes-bridge"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, authorization: str | None = Header(default=None)) -> ChatResponse:
    require_token(authorization)

    timeout_seconds = float(os.getenv("HERMES_BRIDGE_TIMEOUT_SECONDS", "45"))

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(run_agent_sync, req.message, req.context),
            timeout=timeout_seconds,
        )
        return ChatResponse(ok=True, response=response, provider="hermes-python")
    except HTTPException:
        raise
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="调用 Hermes 超时，请稍后再试。") from exc
    except Exception as exc:  # noqa: BLE001
        detail = str(exc) if str(exc) else "调用 Hermes 失败，请检查 bridge 日志。"
        raise HTTPException(status_code=500, detail=f"Hermes Bridge 错误：{detail}") from exc
