import { cancelScheduleItemTool } from "@/lib/mcp/tools/cancel-schedule-item";
import { createCaptureTool } from "@/lib/mcp/tools/create-capture";
import { createFinanceTransactionTool } from "@/lib/mcp/tools/create-finance-transaction";
import { createGoalTool } from "@/lib/mcp/tools/create-goal";
import { createJournalEntryTool } from "@/lib/mcp/tools/create-journal-entry";
import { createScheduleItemTool } from "@/lib/mcp/tools/create-schedule-item";
import { saveInsightTool } from "@/lib/mcp/tools/save-insight";
import { saveReviewTool } from "@/lib/mcp/tools/save-review";
import { updateGoalTool } from "@/lib/mcp/tools/update-goal";
import { updateJournalEntryTool } from "@/lib/mcp/tools/update-journal-entry";
import { updateScheduleItemTool } from "@/lib/mcp/tools/update-schedule-item";

export type CompassAction = {
  type: string;
  [key: string]: unknown;
};

export type CompassActionResult = {
  type: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

const FENCED_JSON = /```json\s*([\s\S]*?)```/gi;

const DISPATCH: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
  create_capture: (p) => createCaptureTool.execute(p),
  create_goal: (p) => createGoalTool.execute(p),
  update_goal: (p) => updateGoalTool.execute(p),
  create_journal_entry: (p) => createJournalEntryTool.execute(p),
  update_journal_entry: (p) => updateJournalEntryTool.execute(p),
  create_finance_transaction: (p) => createFinanceTransactionTool.execute(p),
  create_schedule_item: (p) => createScheduleItemTool.execute(p),
  update_schedule_item: (p) => updateScheduleItemTool.execute(p),
  cancel_schedule_item: (p) => cancelScheduleItemTool.execute(p),
  save_insight: (p) => saveInsightTool.execute(p),
  save_review: (p) => saveReviewTool.execute(p),
};

function tryParse(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export function extractCompassActions(reply: string): CompassAction[] {
  if (!reply) return [];

  const candidates: unknown[] = [];
  let match: RegExpExecArray | null;
  while ((match = FENCED_JSON.exec(reply)) !== null) {
    const parsed = tryParse(match[1].trim());
    if (parsed) candidates.push(parsed);
  }

  if (candidates.length === 0) {
    const stripped = reply.trim();
    if (stripped.startsWith("{") || stripped.startsWith("[")) {
      const parsed = tryParse(stripped);
      if (parsed) candidates.push(parsed);
    }
  }

  const actions: CompassAction[] = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const wrapper = candidate as { compassActions?: unknown };
    const list = Array.isArray(wrapper.compassActions) ? wrapper.compassActions : [];
    for (const item of list) {
      if (item && typeof item === "object" && typeof (item as CompassAction).type === "string") {
        actions.push(item as CompassAction);
      }
    }
  }
  return actions;
}

export async function applyCompassAction(
  action: CompassAction,
  sourceMessageId?: string,
): Promise<CompassActionResult> {
  const dispatcher = DISPATCH[action.type];
  if (!dispatcher) {
    return { type: action.type, ok: false, error: `unknown action type: ${action.type}` };
  }
  try {
    const params = sourceMessageId ? { ...action, sourceMessageId } : { ...action };
    const result = await dispatcher(params);
    return { type: action.type, ok: true, result };
  } catch (error) {
    return {
      type: action.type,
      ok: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

export async function applyCompassActions(
  actions: CompassAction[],
  sourceMessageId?: string,
): Promise<CompassActionResult[]> {
  const results: CompassActionResult[] = [];
  for (const action of actions) {
    results.push(await applyCompassAction(action, sourceMessageId));
  }
  return results;
}
