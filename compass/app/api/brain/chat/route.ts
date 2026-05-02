import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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
          endTime (HH:mm), priority (low|medium|high), evidence,
          reminderEmail, reminderMinutes

- create_goal — long-running objective
  fields: title (req), description, dimension (e.g. 学习/健康/工作),
          targetDate (YYYY-MM-DD). Status defaults to active.
  Goal progress is evidence-driven from completed schedule items.
  Do NOT set progress or status=completed in create_goal.

- update_goal — modify an existing goal
  fields: id (req), and any of: title, description, dimension, targetDate.
  Progress is computed from evidence and cannot be set directly.
  Status can only be changed to active/paused.
  To mark a goal complete, the user must confirm via the UI.

- create_journal_entry — diary/reflection text
  fields: content (req), title, date (YYYY-MM-DD, defaults to today),
          mood (1-5), tags (array or comma-string)

- update_journal_entry — edit an existing journal row
  fields: id (req) + any of: title, content, date, mood, tags

- create_finance_transaction — income or expense
  fields: type (income|expense, req), amount (positive number, req),
          date (YYYY-MM-DD), category, note

- update_schedule_item / cancel_schedule_item
  fields: id (req) + any updatable field.
  Schedule is time-driven: tasks auto-enter active at startTime.
  When the user reports a task is finished, mark status "done" and include:
  completionNote (what happened), reviewScore (0-100).
  Do NOT use delayed/skipped statuses. Use reschedule or missed feedback instead.

- create_capture — quick inbox item the user wants to triage later
  fields: rawText (req), dimension

- save_insight — your own analytical observation about the user
  fields: category (req), title (req), body (req), evidence, confidence (0-1)

- save_review — long-term review memory
  fields: period (task|day|week|month), title (req), body (req), summary,
          startDate, endDate, sourceId, metrics, dimensions

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
- If the user says they completed, failed, delayed, skipped, or partially
  completed a scheduled item, treat it as execution feedback. Update the
  matching schedule item and create a task-level review memory with quantified
  metrics and dimension scores.
- If uploaded files contain goals, exams, projects, courses, habits, deadlines,
  checklists, syllabi, OKRs, or study plans, extract BOTH goals and concrete
  schedule items. If exact dates are missing, create a realistic near-term plan
  starting from currentTime instead of only summarizing the file.
- For weekly/monthly summaries, aggregate completion rate, consistency,
  delay/cancel count, focus quality, and next adjustment into save_review
  metrics/dimensions. The review is a memory layer, not a separate visible task.
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
  kind: "image" | "text" | "pdf" | "file";
  excerpt?: string;
  dataUrl?: string;
  warning?: string;
};

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

async function extractPdfTextWithTool(buffer: Buffer) {
  const dir = await mkdtemp(path.join(tmpdir(), "compass-pdf-"));
  const filePath = path.join(dir, "input.pdf");
  await writeFile(filePath, buffer);

  try {
    return await new Promise<string | null>((resolve) => {
      const child = spawn("pdftotext", ["-layout", "-enc", "UTF-8", filePath, "-"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        resolve(null);
      }, 15_000);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      child.once("error", () => {
        clearTimeout(timer);
        resolve(null);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        if (code === 0 && stdout.trim()) resolve(truncateText(stdout));
        else resolve(stderr.trim() ? null : null);
      });
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function extractPdfTextHeuristic(buffer: Buffer) {
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

async function extractPdfText(buffer: Buffer) {
  const toolText = await extractPdfTextWithTool(buffer).catch(() => null);
  if (toolText) return toolText;
  return extractPdfTextHeuristic(buffer);
}

async function extractDocxText(buffer: Buffer) {
  try {
    const mammoth = (await import("mammoth")) as {
      extractRawText(input: { buffer: Buffer }): Promise<{ value: string }>;
    };
    const result = await mammoth.extractRawText({ buffer });
    return truncateText(result.value);
  } catch {
    return "";
  }
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
    const excerpt = await extractPdfText(buffer);
    return {
      ...base,
      kind: "pdf",
      excerpt: excerpt || "未能从 PDF 中提取到可读文本，已发送文件元数据。",
      warning: excerpt ? undefined : "PDF 可能是扫描件或使用了压缩编码。",
    };
  }

  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extensionOf(file.name) === "docx"
  ) {
    const excerpt = await extractDocxText(buffer);
    return {
      ...base,
      kind: "text",
      excerpt: excerpt || "未能从 Word 文档中提取到可读文本，已发送文件元数据。",
      warning: excerpt ? undefined : "Word 文档可能为空、损坏或使用了暂不支持的结构。",
    };
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
  return "请阅读并分析我上传的目标/计划附件，拆成可执行目标和日程，并写入 Compass。";
}

function stripCompassActionBlocks(value: string) {
  return (
    value
      .replace(/```json\s*[\s\S]*?"compassActions"\s*:\s*\[[\s\S]*?```\s*$/gi, "")
      .replace(/```json\s*[\s\S]*?"compassActions"[\s\S]*?```/gi, "")
      .trim() || "已处理。"
  );
}

function hasPlanningIntent(message: string, attachments: AttachmentForContext[]) {
  if (attachments.length > 0 && !message.trim()) return true;
  return /目标|计划|规划|安排|日程|任务|课程|学习|备考|项目|deadline|okr|todo/i.test(message);
}

function hasPlanningAction(actions: Array<{ type: string }>) {
  return actions.some((action) => action.type === "create_goal" || action.type === "create_schedule_item");
}

function attachmentPromptText(attachments: AttachmentForContext[]) {
  return attachments
    .map((attachment, index) => {
      const lines = [
        `#${index + 1} ${attachment.name}`,
        `type=${attachment.type}`,
        `kind=${attachment.kind}`,
        `size=${attachment.size}`,
      ];
      if (attachment.excerpt) lines.push(`excerpt:\n${attachment.excerpt}`);
      if (attachment.warning) lines.push(`warning=${attachment.warning}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function uniqueActions(actions: ReturnType<typeof extractCompassActions>) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = JSON.stringify(action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function actionResultSummary(results: Awaited<ReturnType<typeof applyCompassActions>>) {
  const ok = results.filter((item) => item.ok);
  const failed = results.filter((item) => !item.ok);
  const labels: Record<string, string> = {
    create_goal: "目标",
    create_schedule_item: "日程",
    update_schedule_item: "日程更新",
    create_journal_entry: "日记",
    create_capture: "收件箱",
    save_review: "复盘记忆",
    save_insight: "洞察",
  };
  const counts = new Map<string, number>();
  for (const item of ok) counts.set(labels[item.type] ?? item.type, (counts.get(labels[item.type] ?? item.type) ?? 0) + 1);
  const written = Array.from(counts.entries()).map(([label, count]) => `${count} 条${label}`).join("、");
  if (ok.length === 0 && failed.length > 0) return `Compass 写入失败：${failed.map((item) => `${item.type}: ${item.error}`).join("；")}`;
  if (failed.length > 0) return `已写入 Compass：${written}。部分失败：${failed.map((item) => `${item.type}: ${item.error}`).join("；")}`;
  return written ? `已写入 Compass：${written}。` : "";
}

async function inferCompassActionsFromHermes(input: {
  message: string;
  attachments: AttachmentForContext[];
  assistantContent: string;
  compass: Awaited<ReturnType<typeof getCompassBrainContext>>;
  config: Awaited<ReturnType<typeof loadBrainConfigFromStore>>;
  currentTime: string;
}) {
  const prompt = `
你是 Compass 的结构化写入抽取器。用户刚上传了目标/计划文件，首轮回复可能没有写入 Compass。

你的任务：只根据用户消息、附件文本、首轮 Hermes 回复和 Compass 上下文，输出应该写入 Compass 的 JSON。

必须做：
- 如果附件里有长期目标，输出 create_goal。
- 如果附件里有任务、学习计划、项目步骤、截止日期、复习内容、每日/每周安排，输出 create_schedule_item。
- 如果没有明确日期，但用户显然想让你安排，就从 currentTime 当天开始，拆成未来 7-14 天内合理的日程。
- 每条日程必须有 date；能判断时间就写 startTime/endTime，不能判断就留空或使用晚间 20:00。
- 不要只总结文件；只输出 JSON，不要解释。
- 不要重复 Compass 上下文中已经存在的同名同日程。

可用 action:
- create_goal: {type,title,description,dimension,targetDate,status}
- create_schedule_item: {type,title,description,date,startTime,endTime,priority,evidence,reminderEmail,reminderMinutes}
- create_capture: {type,rawText,dimension}

用户消息：
${input.message || "（用户只上传了附件）"}

附件：
${attachmentPromptText(input.attachments)}

首轮 Hermes 回复：
${input.assistantContent}

currentTime: ${input.currentTime}

输出格式：
\`\`\`json
{"compassActions":[]}
\`\`\`
`.trim();

  const result = await sendBrainMessage(
    prompt,
    {
      page: "action-extractor",
      compass: input.compass,
      attachments: stripBinary(input.attachments),
      currentTime: input.currentTime,
    },
    input.config,
  );
  return result.ok ? extractCompassActions(result.response) : [];
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

    const currentTime = new Date().toISOString();
    const promptForBrain = `${userContent}\n\n${COMPASS_ACTIONS_HINT}`;

    const result = await sendBrainMessage(
      promptForBrain,
      {
        page: source,
        compass,
        attachments,
        currentTime,
      },
      config,
    );

    const assistantMessageId = crypto.randomUUID();
    const assistantCreatedAt = new Date();
    const rawAssistantContent = result.ok ? result.response : `错误：${result.error ?? "未知错误"}`;

    let actionResults: Awaited<ReturnType<typeof applyCompassActions>> = [];
    let assistantContent = result.ok ? stripCompassActionBlocks(rawAssistantContent) : rawAssistantContent;
    if (result.ok) {
      let actions = extractCompassActions(rawAssistantContent);
      if (
        hasPlanningIntent(message, attachments) &&
        (actions.length === 0 || (attachments.length > 0 && !hasPlanningAction(actions)))
      ) {
        const inferredActions = await inferCompassActionsFromHermes({
          message,
          attachments,
          assistantContent,
          compass,
          config,
          currentTime,
        });
        actions = uniqueActions([...actions, ...inferredActions]);
      }
      if (actions.length > 0) {
        actionResults = await applyCompassActions(actions, assistantMessageId);
        const summary = actionResultSummary(actionResults);
        if (summary) assistantContent = `${assistantContent}\n\n${summary}`;
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
          compassActions: actionResults,
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
