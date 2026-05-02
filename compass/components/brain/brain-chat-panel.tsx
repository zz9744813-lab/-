"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Paperclip, Send, Sparkles, UploadCloud, X, RefreshCw, Settings, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

export type BrainChatAttachmentView = {
  id?: string;
  name: string;
  type?: string;
  size: number;
  kind?: string;
  excerpt?: string;
  warning?: string;
};

export type BrainChatCompassAction = {
  type: string;
  status: "success" | "failed";
  payloadJson?: string;
  errorMessage?: string | null;
};

export type BrainChatMessageView = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: BrainChatAttachmentView[];
  compassActions?: BrainChatCompassAction[];
  provider?: string | null;
  bridgeOk?: boolean | null;
};

type DiagnosticsResult = {
  ok: boolean;
  provider: string;
  hermesBridgeUrl: string | null;
  hasToken: boolean;
  configured: boolean;
  bridgeReachable?: boolean;
  bridgeLatencyMs?: number | null;
  bridgeService?: string | null;
  chatReady?: boolean;
  reason: string | null;
  debugReason: string | null;
  bridgeDiagnostics?: { fallbackEnabled?: boolean; canImportAIAgent?: boolean; [key: string]: unknown } | null;
  recommendations: string[];
};

type BrainChatPanelProps = {
  source: "dashboard" | "brain";
  initialMessages?: BrainChatMessageView[];
  className?: string;
  statusLabel?: string;
  isLive?: boolean;
  disabled?: boolean;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function nowLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function fileToAttachment(file: File): BrainChatAttachmentView {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    kind: file.type.startsWith("image/") ? "image" : "file",
  };
}

function CompassActionsSummary({ actions }: { actions: BrainChatCompassAction[] }) {
  if (!actions || actions.length === 0) return null;
  const ok = actions.filter((a) => a.status === "success");
  const failed = actions.filter((a) => a.status === "failed");
  if (ok.length === 0 && failed.length === 0) return null;

  const labels: Record<string, string> = {
    create_goal: "目标",
    create_schedule_item: "日程",
    update_schedule_item: "日程更新",
    create_journal_entry: "日记",
    create_capture: "收件箱",
    save_review: "复盘记忆",
    save_insight: "洞察",
    propose_plan: "规划草案",
    propose_phase: "计划阶段",
    propose_plan_tasks: "计划任务"
  };

  const counts = new Map<string, number>();
  for (const a of ok) {
    const label = labels[a.type] ?? a.type;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const summary = Array.from(counts.entries()).map(([label, count]) => `${label} × ${count}`).join("、");

  return (
    <div className="mt-2 space-y-2">
      {(summary || failed.length > 0) && (
        <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
          {summary && <span>已写入：{summary}</span>}
          {failed.length > 0 && <span className="text-red-300 ml-2">失败 {failed.length} 项</span>}
        </div>
      )}
      {failed.map((a, i) => (
        <div key={i} className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-3 text-sm">
          <p className="text-red-200 font-medium flex items-center gap-2">
            <AlertTriangle size={14} /> 工具调用失败 ({labels[a.type] ?? a.type})
          </p>
          <p className="text-red-100/80 mt-1">{a.errorMessage}</p>
        </div>
      ))}
    </div>
  );
}

function OfflineDiagnostics({ onRetry }: { onRetry: () => void }) {
  const [diag, setDiag] = useState<DiagnosticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brain/diagnostics");
      const data = await res.json();
      setDiag(data);
    } catch {
      setDiag(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  return (
    <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-300" />
        <span className="text-sm text-amber-200">Hermes 未连接</span>
      </div>

      {diag && (
        <div className="text-xs text-text-secondary space-y-1">
          <p>状态：{diag.reason ?? (diag.bridgeReachable ? "可达" : "未知")}</p>
          {diag.hermesBridgeUrl && <p>Bridge URL：<span className="font-mono">{diag.hermesBridgeUrl}</span></p>}
          <p>Token：{diag.hasToken ? "已配置" : "未配置"}</p>
          {diag.chatReady !== undefined && <p>模型就绪：{diag.chatReady ? "是" : "否"}</p>}
        </div>
      )}

      {diag && diag.recommendations && diag.recommendations.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "收起建议" : "查看修复建议"}
        </button>
      )}

      {expanded && diag && diag.recommendations && (
        <ul className="text-xs text-text-tertiary space-y-1 pl-4 list-disc">
          {diag.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-secondary hover:bg-white/10 transition"
        >
          <RefreshCw size={12} />
          重试连接
        </button>
        <button
          onClick={loadDiagnostics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-secondary hover:bg-white/10 transition disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
          诊断连接
        </button>
        <a
          href="/settings"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-secondary hover:bg-white/10 transition"
        >
          <Settings size={12} />
          打开设置
        </a>
      </div>
    </div>
  );
}

export function BrainChatPanel({
  source,
  initialMessages = [],
  className = "",
  statusLabel = "Hermes 对话",
  isLive = false,
  disabled = false,
}: BrainChatPanelProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<BrainChatMessageView[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<DiagnosticsResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canSubmit = !disabled && !isSending && (message.trim().length > 0 || files.length > 0);
  
  const currentReqStartMs = useRef<number>(0);

  async function loadDiagnostics() {
    try {
      const res = await fetch("/api/brain/diagnostics");
      const data = await res.json();
      setDiagResult(data);
    } catch {
      setDiagResult(null);
    }
  }

  async function loadMessages() {
  }

  useEffect(() => {
    void loadMessages();
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length, isSending]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 180)}px`;
  }, [message]);

  function addFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;
    const incoming = Array.from(fileList).filter((file) => file.size > 0);
    if (incoming.length === 0) return;

    setFiles((current) => {
      const unique = new Map<string, File>();
      for (const item of [...current, ...incoming]) unique.set(`${item.name}-${item.size}-${item.lastModified}`, item);
      const next = Array.from(unique.values());
      if (next.length > 8) setError("最多保留 8 个附件。");
      else setError(null);
      return next.slice(0, 8);
    });
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSubmit) formRef.current?.requestSubmit();
  }

  function handleRetry() {
    window.location.reload();
  }
  
  async function pollOperations(assistantMsgId: string, since: number) {
    try {
      const res = await fetch(`/api/operations/recent?since=${since}`);
      const data = await res.json();
      if (data.actions && data.actions.length > 0) {
        setMessages((curr) => {
          const idx = curr.findIndex(m => m.id === assistantMsgId);
          if (idx === -1) return curr;
          
          const updated = { ...curr[idx] };
          updated.compassActions = data.actions.map((a: any) => ({
            type: a.type,
            status: a.status,
            payloadJson: a.payloadJson,
            errorMessage: a.errorMessage
          }));
          
          const newArr = [...curr];
          newArr[idx] = updated;
          return newArr;
        });
      }
    } catch {
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    const selectedFiles = [...files];
    if ((!text && selectedFiles.length === 0) || disabled || isSending) return;

    const localUser: BrainChatMessageView = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: text || `上传了 ${selectedFiles.length} 个附件`,
      createdAt: nowLabel(),
      attachments: selectedFiles.map(fileToAttachment),
    };

    setMessages((current) => [...current, localUser]);
    setMessage("");
    setFiles([]);
    setError(null);
    setIsSending(true);
    currentReqStartMs.current = Date.now();

    const formData = new FormData();
    formData.append("message", text);
    formData.append("source", source);
    formData.append("sessionId", "compass-ui-session");
    for (const file of selectedFiles) formData.append("files", file);

    const assistantMsgId = `assistant-${Date.now()}`;
    const newAssistantMsg: BrainChatMessageView = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      createdAt: nowLabel(),
      compassActions: []
    };
    
    setMessages((current) => {
      const withoutLocal = current.filter((item) => item.id !== localUser.id);
      return [...withoutLocal, localUser, newAssistantMsg];
    });

    try {
      const response = await fetch("/api/brain/chat", { method: "POST", body: formData });
      if (!response.ok) throw new Error(`请求失败：HTTP ${response.status}`);
      if (!response.body) throw new Error("服务器没有返回流");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";

      const pollInterval = setInterval(() => {
        pollOperations(assistantMsgId, currentReqStartMs.current);
      }, 2000);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (part.startsWith("data: ")) {
              const dataStr = part.slice(6);
              if (dataStr === "[DONE]") {
                continue;
              }
              try {
                const event = JSON.parse(dataStr);
                if (event.choices && event.choices[0]?.delta?.content) {
                  setMessages((curr) => {
                    const idx = curr.findIndex(m => m.id === assistantMsgId);
                    if (idx === -1) return curr;
                    
                    const updated = { ...curr[idx] };
                    updated.content += event.choices[0].delta.content;
                    
                    const newArr = [...curr];
                    newArr[idx] = updated;
                    return newArr;
                  });
                }
              } catch (e) {
              }
            }
          }
        }
      }
      
      clearInterval(pollInterval);
      await pollOperations(assistantMsgId, currentReqStartMs.current);
      
    } catch (err) {
      const rawError = err instanceof Error ? err.message : "发送失败";
      setError(rawError);

      setMessages((current) => {
        const idx = current.findIndex(m => m.id === assistantMsgId);
        if (idx !== -1) {
          const updated = { ...current[idx] };
          updated.content += "\n\n(发生错误: " + rawError + ")";
          updated.bridgeOk = false;
          const newArr = [...current];
          newArr[idx] = updated;
          return newArr;
        }
        return current;
      });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  const hasMessages = messages.length > 0;
  const offlineStatusText = !isLive && hasMessages
    ? "当前离线，下面是历史记录"
    : !isLive && !hasMessages
      ? "当前离线，暂无对话"
      : null;

  return (
    <article
      className={`glass glass-strong p-6 ${className}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget === event.target) setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Hermes 对话</h2>
          </div>
          <p className="mt-1 text-sm text-text-secondary">安排日程、记录想法、分析附件</p>
        </div>
        <div className="inline-flex items-center rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary">
          <span className={`status-dot ${isLive ? "status-dot-ok" : "status-dot-err"}`} />
          {isLive ? statusLabel : offlineStatusText ?? statusLabel}
        </div>
      </div>

      {disabled && !isLive && (
        <div className="mt-4">
          <OfflineDiagnostics onRetry={handleRetry} />
        </div>
      )}

      <div ref={scrollRef} className="chat-scroll mt-5 max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-elevated/60 p-4 text-sm text-text-secondary">
            {disabled ? "Hermes 未连接，无法发送消息。请先修复连接。" : "直接开始，Hermes 会把该记录的写入 Compass。"}
          </div>
        ) : (
          messages.map((item) => (
            <div key={item.id}>
              <div
                className={`max-w-[min(46rem,100%)] rounded-lg border p-3 transition ${
                  item.role === "user"
                    ? "ml-auto border-accent/40 bg-accent-muted"
                    : item.bridgeOk === false
                      ? "border-red-400/20 bg-red-500/5"
                      : "border-border bg-bg-elevated/70"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                  <span>{item.role === "user" ? "我" : "Hermes"}</span>
                  <span>{item.createdAt}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.content}</p>
                {item.attachments && item.attachments.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.attachments.map((attachment) => (
                      <span
                        key={`${item.id}-${attachment.name}-${attachment.size}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-bg-surface px-2 py-1 text-xs text-text-secondary"
                      >
                        {attachment.kind === "image" ? <ImagePlus className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                        <span className="truncate">{attachment.name}</span>
                        <span>{formatBytes(attachment.size)}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {item.compassActions && item.compassActions.length > 0 && (
                <CompassActionsSummary actions={item.compassActions} />
              )}
            </div>
          ))
        )}
        {isSending ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Hermes 正在回复
          </div>
        ) : null}
      </div>

      <form ref={formRef} onSubmit={submit} className="mt-5 space-y-3">
        <div
          className={`relative rounded-lg border bg-bg-elevated p-3 transition ${
            isDragging ? "border-accent shadow-[0_0_0_3px_var(--accent-muted)]" : "border-border"
          }`}
        >
          {isDragging ? (
            <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-md border border-dashed border-accent bg-bg-elevated/90 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-accent" />
                松开即可添加
              </span>
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
            rows={2}
            placeholder={disabled ? "Hermes 未连接，请先修复连接" : "说说要安排、记录或分析的事..."}
            className="min-h-16 max-h-44 w-full resize-none bg-transparent text-sm outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-60"
          />
          {files.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-bg-surface px-2 py-1 text-xs text-text-secondary"
                >
                  {file.type.startsWith("image/") ? <ImagePlus className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                  <span className="truncate">{file.name}</span>
                  <span>{formatBytes(file.size)}</span>
                  <button type="button" title="移除附件" onClick={() => removeFile(index)} className="rounded p-0.5 hover:bg-white/10">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {error && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-red-400/20 bg-red-500/5 px-3 py-2">
            <p className="text-xs text-red-300 truncate">{error.length > 80 ? error.slice(0, 80) + "…" : error}</p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  void loadDiagnostics();
                }}
                className="text-xs text-red-200 hover:text-red-100 underline"
              >
                诊断
              </button>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs text-red-200 hover:text-red-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {diagResult && !error && (
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary space-y-1">
            <p>Bridge：{diagResult.bridgeReachable ? "可达" : "不可达"} {diagResult.bridgeLatencyMs ? `· ${diagResult.bridgeLatencyMs}ms` : ""}</p>
            <p>模型就绪：{diagResult.chatReady ? "是" : "否"}</p>
            {diagResult.bridgeDiagnostics && diagResult.bridgeDiagnostics.fallbackEnabled && <p>Fallback：已启用</p>}
            {diagResult.reason && <p className="text-amber-300">{diagResult.reason}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              addFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            title="上传附件"
            disabled={disabled || isSending}
            onClick={() => fileInputRef.current?.click()}
            className="glass-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" />
            附件
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="glass-btn glass-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            发送
          </button>
        </div>
      </form>
    </article>
  );
}
