"use client";

import { FormEvent, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Paperclip, Send, X } from "lucide-react";

export type BrainChatAttachmentView = {
  id?: string;
  name: string;
  type?: string;
  size: number;
  kind?: string;
  excerpt?: string;
  warning?: string;
};

export type BrainChatMessageView = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: BrainChatAttachmentView[];
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

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const incoming = Array.from(fileList).filter((file) => file.size > 0);
    if (incoming.length === 0) return;
    setFiles((current) => {
      const merged = [...current, ...incoming];
      const unique = new Map<string, File>();
      for (const item of merged) unique.set(`${item.name}-${item.size}-${item.lastModified}`, item);
      return Array.from(unique.values()).slice(0, 8);
    });
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
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
        assistantMessage?: BrainChatMessageView;
      };

      if (!response.ok || !payload.ok || !payload.assistantMessage) {
        throw new Error(payload.error ?? `请求失败：HTTP ${response.status}`);
      }

      setMessages((current) => [...current, payload.assistantMessage as BrainChatMessageView]);
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
      className={`glass p-6 ${className}`}
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
        if (!disabled) addFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Hermes 对话</h2>
          <p className="mt-1 text-sm text-text-secondary">安排日程、记录想法、分析附件</p>
        </div>
        <div className="inline-flex items-center rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary">
          <span className={`status-dot ${isLive ? "status-dot-ok" : "status-dot-off"}`} />
          {statusLabel}
        </div>
      </div>

      <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-elevated/60 p-4 text-sm text-text-secondary">
            直接和 Hermes 说你要安排、记录或复盘的事情。
          </div>
        ) : (
          messages.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border p-3 ${
                item.role === "user" ? "border-accent/40 bg-accent-muted" : "border-border bg-bg-elevated/70"
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
          ))
        )}
        {isSending ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Hermes 正在回复
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <div
          className={`rounded-lg border bg-bg-elevated p-3 transition ${
            isDragging ? "border-accent shadow-[0_0_0_3px_var(--accent-muted)]" : "border-border"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={disabled || isSending}
            rows={3}
            placeholder={disabled ? "Hermes 未连接" : "问问 Hermes，或拖拽文件/图片到这里……"}
            className="min-h-20 w-full resize-y bg-transparent text-sm outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed"
          />
          {files.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span key={`${file.name}-${file.size}-${file.lastModified}`} className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-bg-surface px-2 py-1 text-xs text-text-secondary">
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
          <div className="flex items-center gap-2">
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
            <span className="text-xs text-text-tertiary">支持拖拽，最多 8 个</span>
          </div>
          <button
            type="submit"
            disabled={disabled || isSending || (!message.trim() && files.length === 0)}
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
