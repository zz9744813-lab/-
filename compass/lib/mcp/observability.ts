/**
 * MCP observability — records brain_runs and brain_actions for every
 * tool call that Hermes makes through the Compass MCP server.
 *
 * [T-21] Phase 2
 */

import { db } from "@/lib/db/client";
import { brainRuns, brainActions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

export type RunContext = {
  runId: string;
  sessionId: string | null;
};

export async function startMcpRun(input: {
  source: string;
  sessionId: string | null;
}): Promise<RunContext> {
  const runId = crypto.randomUUID();
  await db.insert(brainRuns).values({
    id: runId,
    source: input.source,
    userInput: "(MCP tool call from Hermes)",
    contextSnapshotJson: JSON.stringify({ sessionId: input.sessionId }),
    modelProvider: "hermes-agent",
    status: "in_progress",
  });
  return { runId, sessionId: input.sessionId };
}

export async function logMcpAction(
  ctx: RunContext,
  args: {
    toolName: string;
    payload: unknown;
    status: "success" | "failed";
    resultRefId?: string | null;
    resultRefTable?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  await db.insert(brainActions).values({
    id: crypto.randomUUID(),
    runId: ctx.runId,
    type: args.toolName.replace(/^compass\./, ""),
    payloadJson: JSON.stringify(args.payload),
    status: args.status,
    resultRefId: args.resultRefId ?? null,
    resultRefTable: args.resultRefTable ?? null,
    errorMessage: args.errorMessage ?? null,
  });
}

export async function finishMcpRun(
  ctx: RunContext,
  status: "completed" | "failed",
  errorMessage?: string,
): Promise<void> {
  await db
    .update(brainRuns)
    .set({
      status,
      finishedAt: new Date(),
      errorMessage: errorMessage ?? null,
    })
    .where(eq(brainRuns.id, ctx.runId));
}
