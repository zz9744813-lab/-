import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { sendBrainMessage } from "@/lib/brain/client";
import { applyCompassActions, extractCompassActions } from "@/lib/brain/compass-actions";
import { getCompassBrainContext } from "@/lib/brain/context";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { db } from "@/lib/db/client";
import { hermesMessages } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";

const COMPASS_ACTIONS_HINT = `
[Compass write protocol]

You are reasoning about the user's life. Compass is a structured data store
behind you. Whenever the user's message or uploaded files contain content
that belongs in a Compass module, append a fenced JSON block at the END of
your reply describing what to persist. Compass parses ONLY this JSON block.

Available action types:

- create_schedule_item — calendar/task with date/time
  fields: title (req), description, date (YYYY-MM-DD, req), startTime (HH:mm),
          endTime (HH:mm), priority (low|medium|high), evidence

- create_goal — long-running objective
  fields: title (req), description, dimension (e.g. 学习/健康/工作),
          targetDate (YYYY-MM-DD), status (active|completed|paused)

- update_goal — modify an existing goal
  fields: id (req), and any of: title, description, dimension, status,
          targetDate, progress (0-100)

- create_journal_entry — diary/reflection text
  fields: content (req), title, date (YYYY-MM-DD, defaults to today),
          mood (1-5), tags (array or comma-string)

- update_journal_entry — edit an existing journal row
  fields: id (req) + any of: title, content, date, mood, tags

- create_finance_transaction — income or expense
  fields: type (income|expense, req), amount (positive number, req),
          date (YYYY-MM-DD), category, note

- update_schedule_item / cancel_schedule_item
  fields: id (req) + any updatable field

- create_capture — quick inbox item the user wants to triage later
  fields: rawText (req), dimension

- save_insight — your own analytical observation about the user
  fields: category (req), title (req), body (req), evidence, confidence (0-1)

- save_review — periodic recap text
  fields: period (req), title (req), body (req), startDate, endDate

Required JSON shape (REPLY MUST END LIKE THIS WHEN PERSISTING):
\`\`\`json
{"compassActions":[
  {"type":"create_finance_transaction","type_inner":"expense","amount":35.5,"category":"餐饮","date":"2026-04-30","note":"地铁站买的便当"},
  {"type":"create_schedule_item","title":"复习日语 N3 第3课","date":"2026-05-02","startTime":"20:00","endTime":"21:00","priority":"medium","evidence":"用户上传的学习计划提到本周要复习 N3"}
]}
\`\`\`

Rules:
- Only emit the JSON block when there's data to persist. If the user is just
  chatting or asking a question, omit it entirely.
- Multiple actions in one block is fine. They run in order.
- Use ISO dates and 24h times. Use the user's timezone implied by currentTime
  in the context.
- Do NOT echo back data Compass already has. Only emit NEW persistence intents.
`.trim();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILES = 8;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 10_000;

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "log",
  "xml",
  "html",
  "css",
  "js",
  "ts",
  "tsx",
  "jsx",
  "py",
  "yml",
  "yaml",
]);

type AttachmentForContext = {
  id: string;
  name: string;
  type: string;
  size: number;
  kind: "image" | "text" | "pdf" | "docx" | "file";
  excerpt?: string;
  dataUrl?: string;
  warning?: string;
};

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth: typeof import("mammoth") = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return truncateText(result.value || "");
}

function extensionOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

function isTextLike(file: File) {
  return file.type.startsWith("text/") || TEXT_EXTENSIONS.has(extensionOf(file.name));
}

function truncateText(value: string, max = MAX_TEXT_CHARS) {
  const normalized = value.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}\n...` : normalized;
}

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, token: string) => {
      const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "", f: "", "(": "(", ")": ")", "\\": "\\" };
      return map[token] ?? token;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function extractPdfText(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const parts: string[] = [];
  const literalRegex = /\((?:\\.|[^\\()]){2,}\)\s*Tj/g;
  const arrayRegex = /\[(.*?)\]\s*TJ/gs;
  let match: RegExpExecArray | null;

  while ((match = literalRegex.exec(raw)) !== null && parts.join(" ").length < MAX_TEXT_CHARS * 2) {
    parts.push(decodePdfLiteral(match[0].replace(/\)\s*Tj$/, "").slice(1)));
  }

  while ((match = arrayRegex.exec(raw)) !== null && parts.join(" ").length < MAX_TEXT_CHARS * 2) {
    const literals = match[1].match(/\((?:\\.|[^\\()])*\)/g) ?? [];
    for (const literal of literals) parts.push(decodePdfLiteral(literal.slice(1, -1)));
  }

  return truncateText(parts.join(" ").replace(/\s+/g, " "));
}

async function summarizeFile(file: File): Promise<AttachmentForContext> {
  const id = crypto.randomUUID();
  const type = file.type || "application/octet-stream";
  const base = { id, name: file.name, type, size: file.size };

  if (file.size > MAX_FILE_BYTES) {
    return { ...base, kind: "file", warning: `文件超过 ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB，已只发送元数据。` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (type.startsWith("image/")) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { ...base, kind: "image", warning: `图片超过 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB，已只发送元数据。` };
    }
    return { ...base, kind: "image", dataUrl: `data:${type};base64,${buffer.toString("base64")}` };
  }

  if (type === "application/pdf" || extensionOf(file.name) === "pdf") {
    const excerpt = extractPdfText(buffer);
    return {
      ...base,
      kind: "pdf",
      excerpt: excerpt || "未能从 PDF 中提取到可读文本，已发送文件元数据。",
      warning: excerpt ? undefined : "PDF 可能是扫描件或使用了压缩编码。",
    };
  }

  if (type === DOCX_MIME || extensionOf(file.name) === "docx") {
    try {
      const excerpt = await extractDocxText(buffer);
      return {
        ...base,
        kind: "docx",
        excerpt: excerpt || "Word 文档中未提取到可读文本。",
        warning: excerpt ? undefined : "文档可能包含图片或不可解析的内容。",
      };
    } catch (error) {
      return {
        ...base,
        kind: "docx",
        warning: `Word 文档解析失败：${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  if (isTextLike(file)) {
    return { ...base, kind: "text", excerpt: truncateText(buffer.toString("utf8")) };
  }

  return { ...base, kind: "file", warning: "暂未识别此文件类型，已发送文件元数据。" };
}

function stripBinary(attachments: AttachmentForContext[]) {
  return attachments.map(({ dataUrl: _dataUrl, ...attachment }) => attachment);
}

function buildUserContent(message: string, attachments: AttachmentForContext[]) {
  if (message) return message;
  if (attachments.length === 0) return "请结合我的 Compass 上下文给出建议。";
  return "请阅读并分析我上传的附件，结合我的 Compass 上下文给出可执行建议。";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const message = String(formData.get("message") ?? "").trim();
    const rawSource = String(formData.get("source") ?? "web").trim();
    const source = rawSource === "dashboard" || rawSource === "brain" ? rawSource : "web";
    const files = formData.getAll("files").filter((value): value is File => value instanceof File).slice(0, MAX_FILES);

    if (!message && files.length === 0) {
      return NextResponse.json({ ok: false, error: "请输入内容或上传附件。" }, { status: 400 });
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json({ ok: false, error: `附件总大小不能超过 ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB。` }, { status: 413 });
    }

    const attachments = await Promise.all(files.map(summarizeFile));
    const storedAttachments = stripBinary(attachments);
    const userContent = buildUserContent(message, attachments);
    const config = await loadBrainConfigFromStore();
    const compass = await getCompassBrainContext();
    const createdAt = new Date();
    const userMessageId = crypto.randomUUID();

    await db.insert(hermesMessages).values({
      id: userMessageId,
      role: "user",
      content: message || `上传了 ${attachments.length} 个附件`,
      source,
      toolCall: attachments.length > 0 ? JSON.stringify({ attachments: storedAttachments }) : null,
      createdAt,
    });

    const promptForBrain = `${userContent}\n\n${COMPASS_ACTIONS_HINT}`;

    const result = await sendBrainMessage(
      promptForBrain,
      {
        page: source,
        compass,
        attachments,
        currentTime: new Date().toISOString(),
      },
      config,
    );

    const assistantMessageId = crypto.randomUUID();
    const assistantCreatedAt = new Date();
    const assistantContent = result.ok ? result.response : `错误：${result.error ?? "未知错误"}`;

    let actionResults: Awaited<ReturnType<typeof applyCompassActions>> = [];
    if (result.ok) {
      const actions = extractCompassActions(result.response);
      if (actions.length > 0) {
        actionResults = await applyCompassActions(actions, assistantMessageId);
      }
    }

    await db.insert(hermesMessages).values({
      id: assistantMessageId,
      role: "assistant",
      content: assistantContent,
      source,
      toolCall: JSON.stringify({
        provider: result.provider,
        ok: result.ok,
        attachments: storedAttachments,
        compassActions: actionResults,
      }),
      createdAt: assistantCreatedAt,
    });

    return NextResponse.json(
      {
        ok: result.ok,
        error: result.ok ? undefined : result.error,
        userMessage: {
          id: userMessageId,
          role: "user",
          content: message || `上传了 ${attachments.length} 个附件`,
          createdAt: formatDateTime(createdAt),
          attachments: storedAttachments,
        },
        assistantMessage: {
          id: assistantMessageId,
          role: "assistant",
          content: assistantContent,
          createdAt: formatDateTime(assistantCreatedAt),
          attachments: [],
        },
        compassActions: actionResults,
      },
      { status: result.ok ? 200 : 502 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Hermes 对话失败。" },
      { status: 500 },
    );
  }
}
