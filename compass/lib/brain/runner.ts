import { db } from "@/lib/db/client";
import { brainRuns, brainActions, brainAttachments } from "@/lib/db/schema";
import { parseBrainStream, type ParserEvent } from "./stream-parser";
import { validateAction } from "./action-schemas";
import { compassTools } from "@/lib/mcp/tools";
import { eq } from "drizzle-orm";
import { buildSystemPrompt } from "./prompt-builder";
import { extractAttachment } from "./attachments";

export type TurnEvent = ParserEvent;

export async function* runBrainTurn(input: {
  userMessage: string;
  attachments: File[];
  source: string;
}): AsyncGenerator<TurnEvent> {
  const runId = crypto.randomUUID();
  
  await db.insert(brainRuns).values({
    id: runId,
    source: input.source,
    userInput: input.userMessage,
    status: 'in_progress',
  });

  const processedAttachments: Array<{ id: string; name: string; text: string | null; warnings: string[] }> = [];

  for (const file of input.attachments) {
    const extracted = await extractAttachment(file);
    const attId = crypto.randomUUID();
    await db.insert(brainAttachments).values({
      id: attId,
      runId,
      name: extracted.name,
      mimeType: extracted.mimeType,
      sizeBytes: extracted.sizeBytes,
      sha256: extracted.sha256,
      extractedText: extracted.extractedText,
    });
    processedAttachments.push({
      id: attId,
      name: extracted.name,
      text: extracted.extractedText,
      warnings: extracted.warnings,
    });
  }

  const context = { attachments: processedAttachments };

  const attachmentSection = processedAttachments
    .filter((a) => a.text)
    .map(
      (a, idx) =>
        `\n====== 附件 ${idx + 1}: ${a.name} ======\n${a.text}\n====== /附件 ${idx + 1} ======`
    )
    .join("\n");

  const composedMessage = attachmentSection
    ? `${input.userMessage}\n\n以下是用户附带的文件内容,你需要从中抽取任务、目标、计划等结构化信息:${attachmentSection}`
    : input.userMessage;

  const bridgeUrl = process.env.HERMES_BRIDGE_URL || "http://127.0.0.1:8000";
  const bridgeToken = process.env.HERMES_BRIDGE_TOKEN || "";

  const systemPrompt = await buildSystemPrompt();

  const response = await fetch(`${bridgeUrl}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${bridgeToken}`
    },
    body: JSON.stringify({ message: composedMessage, context, system: systemPrompt })
  });

  if (!response.ok || !response.body) {
    await db.update(brainRuns).set({ status: 'failed', errorMessage: 'Bridge stream failed' }).where(eq(brainRuns.id, runId));
    throw new Error("Bridge stream failed");
  }

  async function* streamChunks() {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder("utf-8");
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  }

  let finalStatus = 'completed';
  const rawChunks: string[] = [];

  for await (const event of parseBrainStream(streamChunks())) {
    if (event.type === 'text') {
      rawChunks.push(event.delta);
    } else if (event.type === 'action_complete') {
      const valid = validateAction(event.actionType, event.payload);
      const actionId = crypto.randomUUID();
      
      if (!valid.ok) {
        await db.insert(brainActions).values({
          id: actionId,
          runId,
          type: event.actionType,
          payloadJson: JSON.stringify(event.payload),
          status: 'failed',
          errorMessage: valid.errors.join("; ")
        });
      } else {
        const toolName = `compass.${event.actionType}`;
        const tool = compassTools.find(t => t.name === toolName);
        let resultRefId = null;
        let actionStatus = 'success';
        let errMsg = null;

        if (tool) {
          try {
            const res = await tool.execute(valid.data as any) as any;
            if (res && res.id) resultRefId = res.id;
          } catch (err: any) {
            actionStatus = 'failed';
            errMsg = err.message;
          }
        } else {
          actionStatus = 'pending';
        }

        await db.insert(brainActions).values({
          id: actionId,
          runId,
          type: event.actionType,
          payloadJson: JSON.stringify(valid.data),
          status: actionStatus,
          resultRefId,
          errorMessage: errMsg
        });
      }
    } else if (event.type === 'needs_input') {
      finalStatus = 'needs_input';
      await db.insert(brainActions).values({
        id: crypto.randomUUID(),
        runId,
        type: event.actionType,
        payloadJson: JSON.stringify(event.draft),
        status: 'needs_input',
        missingFieldsJson: JSON.stringify(event.missing)
      });
    }

    yield event;
  }

  await db.update(brainRuns).set({ 
    status: finalStatus, 
    finishedAt: new Date(),
    modelRawResponse: rawChunks.join("")
  }).where(eq(brainRuns.id, runId));
}
