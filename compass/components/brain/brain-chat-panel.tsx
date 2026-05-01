"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, ImagePlus, Loader2, Paperclip, Send, Sparkles, UploadCloud, X } from "lucide-react";

export type BrainChatAttachmentView = {
  id?: string;
  name: string;
  type?: string;
  size: number;
  kind?: string;
  excerpt?: string;
  warning?: string;
};

export type BrainChatActionResultView = {
  type: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type BrainChatMessageView = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: BrainChatAttachmentView[];
  compassActions?: BrainChatActionResultView[];
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

const ACTION_LABELS: Record<string, string> = {
  create_schedule_item: "日程",
  update_schedule_item: "日程更新",
  cancel_schedule_item: "日程取消",
  create_goal: "目标",
  update_goal: "目标更新",
  create_journal_entry: "日记",
  update_journal_entry: "日记更新",
  create_finance_transaction: "记账",
  create_capture: "收件箱",
  save_insight: "洞察",
  save_review: "复盘",
};

function summarizeActions(actions: BrainChatActionResultView[]) {
  const okCounts = new Map<string, number>();
  const failures: BrainChatActionResultView[] = [];
  for (const action of actions) {
    if (action.ok) {
      okCounts.set(action.type, (okCounts.get(action.type) ?? 0) + 1);
    } else {
      failures.push(action);
    }
  }
  const okSummary = Array.from(okCounts.entries()).map(([type, count]) => {
    const label = ACTION_LABELS[type] ?? type;
    return `${label} × ${count}`;
  });
  return { okSummary, failures };
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canSubmit = !disabled && !isSending && (message.trim().length > 0 || files.length > 0);

  async function loadMessages() {
    try {
      const response = await fetch("/api/brain/messages?limit=40", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        messages?: BrainChatMessageView[];
      };
      if (response.ok && payload.ok && Array.isArray(payload.messages)) {
        setMessages(payload.messages);
      }
    } catch {
      // Keep the server-rendered messages if history refresh is unavailable.
    }
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

    const formData = new FormData();
    formData.append("message", text);
    formData.append("source", source);
    for (const file of selectedFiles) formData.append("files", file);

    try {
      const response = await fetch("/api/brain/chat", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        userMessage?: BrainChatMessageView;
        assistantMessage?: BrainChatMessageView;
        compassActions?: BrainChatActionResultView[];
      };

      if (!response.ok || !payload.ok || !payload.assistantMessage) {
        throw new Error(payload.error ?? `请求失败：HTTP ${response.status}`);
      }

      const assistant: BrainChatMessageView = {
        ...(payload.assistantMessage as BrainChatMessageView),
        compassActions: payload.compassActions,
      };
      setMessages((current) => {
        const withoutLocal = current.filter((item) => item.id !== localUser.id);
        const next = payload.userMessage ? [...withoutLocal, payload.userMessage] : withoutLocal;
        return [...next, assistant];
      });
      void loadMessages();
    } catch (err) {
      const textError = err instanceof Error ? err.message : "发送失败";
      setError(textError);
      setMessages((current) => [
        ...current,
        {
          id: `local-error-${Date.now()}`,
          role: "assistant",
          content: `发送失败：${textError}`,
          createdAt: nowLabel(),
        },
      ]);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

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
          <span className={`status-dot ${isLive ? "status-dot-ok" : "status-dot-off"}`} />
          {statusLabel}
        </div>
      </div>

      <div ref={scrollRef} className="chat-scroll mt-5 max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-elevated/60 p-4 text-sm text-text-secondary">
            直接开始，Hermes 会把该记录的写入 Compass。
          </div>
        ) : (
          messages.map((item) => (
            <div
              key={item.id}
              className={`max-w-[min(46rem,100%)] rounded-lg border p-3 transition ${
                item.role === "user"
                  ? "ml-auto border-accent/40 bg-accent-muted"
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
              {item.compassActions && item.compassActions.length > 0 ? (
                (() => {
                  const { okSummary, failures } = summarizeActions(item.compassActions);
                  if (okSummary.length === 0 && failures.length === 0) return null;
                  return (
                    <div className="mt-3 space-y-1.5 rounded-md border border-border bg-bg-surface/60 p-2.5 text-xs">
                      {okSummary.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-text-secondary">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>已写入 Compass：</span>
                          {okSummary.map((label) => (
                            <span
                              key={label}
                              className="inline-flex items-center rounded border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {failures.length > 0 ? (
                        <div className="flex flex-col gap-1 text-amber-200">
                          {failures.map((failure, index) => (
                            <div key={`${item.id}-fail-${index}`} className="flex items-start gap-1.5">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                              <span>
                                <span className="font-medium">{ACTION_LABELS[failure.type] ?? failure.type}</span>
                                <span className="text-amber-300/80"> 写入失败：{failure.error ?? "未知错误"}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ) : null}
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
            placeholder={disabled ? "Hermes 未连接" : "说说要安排、记录或分析的事..."}
            className="min-h-16 max-h-44 w-full resize-none bg-transparent text-sm outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed"
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

        {error ? <p className="text-sm text-danger">{error}</p> : null}

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
