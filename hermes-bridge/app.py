import asyncio
import copy
import json
import os
import urllib.error
import urllib.request
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


def first_env(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip() != "":
            return value.strip()
    return None


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
        raise RuntimeError("无法导入 Hermes AIAgent，请确认 bridge 运行在 Hermes Python 环境中。") from exc

    kwargs: dict[str, Any] = {
        "quiet_mode": True,
        "skip_memory": parse_bool_env("HERMES_BRIDGE_SKIP_MEMORY", False),
        "skip_context_files": parse_bool_env("HERMES_BRIDGE_SKIP_CONTEXT_FILES", False),
    }

    # Keep the bridge aligned with Hermes gateway by default: if no explicit
    # HERMES_AGENT_* override is configured, AIAgent reads ~/.hermes/config.yaml.
    # Legacy MODEL_PROVIDER/DEEPSEEK_* variables are still honored when present,
    # but the bridge no longer injects DeepSeek defaults that can shadow the
    # user's primary Hermes model.
    provider = first_env("HERMES_AGENT_PROVIDER", "MODEL_PROVIDER")
    base_url = first_env("HERMES_AGENT_BASE_URL", "DEEPSEEK_BASE_URL")
    api_key = first_env("HERMES_AGENT_API_KEY", "DEEPSEEK_API_KEY")
    model = first_env("HERMES_AGENT_MODEL", "DEEPSEEK_MODEL")

    if provider:
        kwargs["provider"] = provider
    if base_url:
        kwargs["base_url"] = base_url
    if api_key:
        kwargs["api_key"] = api_key
    if model:
        kwargs["model"] = model
    return AIAgent(**kwargs)


def context_has_attachments(context: dict[str, Any]) -> bool:
    attachments = context.get("attachments")
    return isinstance(attachments, list) and len(attachments) > 0


def scrub_context_for_prompt(context: dict[str, Any]) -> dict[str, Any]:
    safe_context = copy.deepcopy(context)
    attachments = safe_context.get("attachments")
    if isinstance(attachments, list):
        for attachment in attachments:
            if isinstance(attachment, dict):
                attachment.pop("dataUrl", None)
    return safe_context


def image_parts_from_context(context: dict[str, Any]) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = []
    attachments = context.get("attachments")
    if not isinstance(attachments, list):
        return parts
    for attachment in attachments:
        if not isinstance(attachment, dict):
            continue
        data_url = attachment.get("dataUrl")
        kind = attachment.get("kind")
        if kind == "image" and isinstance(data_url, str) and data_url.startswith("data:image/"):
            parts.append({"type": "image_url", "image_url": {"url": data_url}})
    return parts


def build_prompt(message: str, context: dict[str, Any]) -> str:
    if not context:
        return message
    context_text = json.dumps(scrub_context_for_prompt(context), ensure_ascii=False, default=str)
    return f"{message}\n\n[Compass context]\n{context_text}"


def parse_chat_completion(data: dict[str, Any]) -> str:
    choice = (data.get("choices") or [{}])[0]
    message_data = choice.get("message") or {}
    text = (message_data.get("content") or "").strip()
    if not text:
        text = (message_data.get("reasoning_content") or "").strip()
    if not text:
        raise RuntimeError("fallback 没有返回可读文本")
    return text


def post_chat_completion(base_url: str, api_key: str, payload: dict[str, Any]) -> str:
    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=float(os.getenv("HERMES_BRIDGE_FALLBACK_TIMEOUT", "90"))) as response:
        data = json.loads(response.read().decode("utf-8"))
    return parse_chat_completion(data)


def call_direct_fallback(message: str, context: dict[str, Any]) -> str:
    api_key = os.getenv("HERMES_BRIDGE_FALLBACK_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("Hermes fallback 缺少 HERMES_BRIDGE_FALLBACK_API_KEY/DEEPSEEK_API_KEY")

    base_url = (os.getenv("HERMES_BRIDGE_FALLBACK_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com").rstrip("/")
    model = os.getenv("HERMES_BRIDGE_FALLBACK_MODEL") or os.getenv("DEEPSEEK_MODEL") or "deepseek-v4-flash"
    prompt = build_prompt(message, context)
    image_parts = image_parts_from_context(context)
    user_content: str | list[dict[str, Any]] = prompt
    if image_parts:
        user_content = [{"type": "text", "text": prompt}, *image_parts]

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "你是 Compass 的个人成长大脑。请基于 Compass 上下文、用户输入和附件给出具体、可执行的中文回复。",
            },
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.3,
        "max_tokens": int(os.getenv("HERMES_BRIDGE_FALLBACK_MAX_TOKENS", "2048")),
    }

    try:
        return post_chat_completion(base_url, api_key, payload)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:500]
        if not image_parts:
            raise RuntimeError(f"fallback 返回 HTTP {exc.code}: {body}") from exc
        payload["messages"][-1]["content"] = prompt
        try:
            return post_chat_completion(base_url, api_key, payload)
        except urllib.error.HTTPError as retry_exc:
            retry_body = retry_exc.read().decode("utf-8", "replace")[:500]
            raise RuntimeError(f"fallback 返回 HTTP {retry_exc.code}: {retry_body}") from retry_exc


def run_agent_sync(message: str, context: dict[str, Any]) -> tuple[str, str]:
    if parse_bool_env("HERMES_BRIDGE_DIRECT_FOR_ATTACHMENTS", False) and context_has_attachments(context):
        return call_direct_fallback(message, context), "direct-attachments"

    prompt = build_prompt(message, context)

    try:
        agent = build_agent()
        for method_name in ("run", "chat", "respond"):
            method = getattr(agent, method_name, None)
            if callable(method):
                result = method(prompt)
                text = "" if result is None else str(result).strip()
                if text and text.lower() != "none":
                    return text, "hermes-python"
                break
    except Exception as exc:  # noqa: BLE001
        if not parse_bool_env("HERMES_BRIDGE_ALLOW_DIRECT_FALLBACK", True):
            raise
        print(f"Hermes Python 调用失败，使用 fallback: {exc}", flush=True)

    if parse_bool_env("HERMES_BRIDGE_ALLOW_DIRECT_FALLBACK", True):
        return call_direct_fallback(message, context), "direct-fallback"

    raise RuntimeError("Hermes 没有返回可用回复")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "hermes-bridge"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, authorization: str | None = Header(default=None)) -> ChatResponse:
    require_token(authorization)
    timeout_seconds = float(os.getenv("HERMES_BRIDGE_TIMEOUT_SECONDS", "90"))

    try:
        response, provider = await asyncio.wait_for(
            asyncio.to_thread(run_agent_sync, req.message, req.context),
            timeout=timeout_seconds,
        )
        return ChatResponse(ok=True, response=response, provider=provider)
    except HTTPException:
        raise
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="调用 Hermes 超时，请稍后再试。") from exc
    except Exception as exc:  # noqa: BLE001
        detail = str(exc) if str(exc) else "调用 Hermes 失败，请检查 bridge 日志。"
        raise HTTPException(status_code=500, detail=f"Hermes Bridge 错误：{detail}") from exc
