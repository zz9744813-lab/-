import asyncio
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


def require_token(authorization: str | None) -> None:
    expected = os.getenv("HERMES_BRIDGE_TOKEN", "").strip()
    if not expected:
        return
    expected_header = f"Bearer {expected}"
    if authorization != expected_header:
        raise HTTPException(status_code=401, detail="????bridge token ????")


def build_agent() -> Any:
    try:
        from run_agent import AIAgent
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("???? Hermes AIAgent???? bridge ??? Hermes ??????") from exc

    kwargs: dict[str, Any] = {
        "quiet_mode": True,
        "skip_memory": parse_bool_env("HERMES_BRIDGE_SKIP_MEMORY", False),
        "skip_context_files": parse_bool_env("HERMES_BRIDGE_SKIP_CONTEXT_FILES", False),
    }
    provider = os.getenv("HERMES_AGENT_PROVIDER") or os.getenv("MODEL_PROVIDER") or "deepseek"
    base_url = os.getenv("HERMES_AGENT_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com"
    api_key = os.getenv("HERMES_AGENT_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
    model = os.getenv("HERMES_AGENT_MODEL") or os.getenv("DEEPSEEK_MODEL") or "deepseek-v4-flash"
    if provider:
        kwargs["provider"] = provider
    if base_url:
        kwargs["base_url"] = base_url
    if api_key:
        kwargs["api_key"] = api_key
    if model:
        kwargs["model"] = model
    return AIAgent(**kwargs)


def build_prompt(message: str, context: dict[str, Any]) -> str:
    if not context:
        return message
    context_text = json.dumps(context, ensure_ascii=False, default=str)
    return f"{message}\n\n[Compass context]\n{context_text}"


def call_direct_fallback(message: str, context: dict[str, Any]) -> str:
    api_key = os.getenv("HERMES_BRIDGE_FALLBACK_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("Hermes ?????????? HERMES_BRIDGE_FALLBACK_API_KEY/DEEPSEEK_API_KEY")

    base_url = (os.getenv("HERMES_BRIDGE_FALLBACK_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com").rstrip("/")
    model = os.getenv("HERMES_BRIDGE_FALLBACK_MODEL") or os.getenv("DEEPSEEK_MODEL") or "deepseek-v4-flash"
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "?? Compass ??????????????????????????? Compass ???????????????",
            },
            {"role": "user", "content": build_prompt(message, context)},
        ],
        "temperature": 0.3,
        "max_tokens": int(os.getenv("HERMES_BRIDGE_FALLBACK_MAX_TOKENS", "2048")),
    }
    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=float(os.getenv("HERMES_BRIDGE_FALLBACK_TIMEOUT", "90"))) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"fallback ?? HTTP {exc.code}: {body}") from exc

    choice = (data.get("choices") or [{}])[0]
    message_data = choice.get("message") or {}
    text = (message_data.get("content") or "").strip()
    if not text:
        text = (message_data.get("reasoning_content") or "").strip()
    if not text:
        raise RuntimeError("fallback ??????????")
    return text


def run_agent_sync(message: str, context: dict[str, Any]) -> tuple[str, str]:
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
        print(f"Hermes Python ??????? fallback: {exc}", flush=True)

    if parse_bool_env("HERMES_BRIDGE_ALLOW_DIRECT_FALLBACK", True):
        return call_direct_fallback(message, context), "deepseek-direct-fallback"

    raise RuntimeError("Hermes ????????")


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
        raise HTTPException(status_code=504, detail="?? Hermes ?????????") from exc
    except Exception as exc:  # noqa: BLE001
        detail = str(exc) if str(exc) else "?? Hermes ?????? bridge ???"
        raise HTTPException(status_code=500, detail=f"Hermes Bridge ???{detail}") from exc
