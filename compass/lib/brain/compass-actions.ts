import { cancelScheduleItemTool } from "@/lib/mcp/tools/cancel-schedule-item";
import { createScheduleItemTool } from "@/lib/mcp/tools/create-schedule-item";
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
  try {
    if (action.type === "create_schedule_item") {
      const result = await createScheduleItemTool.execute({ ...action, sourceMessageId });
      return { type: action.type, ok: true, result };
    }
    if (action.type === "update_schedule_item") {
      const result = await updateScheduleItemTool.execute(action);
      return { type: action.type, ok: true, result };
    }
    if (action.type === "cancel_schedule_item") {
      const result = await cancelScheduleItemTool.execute(action);
      return { type: action.type, ok: true, result };
    }
    return { type: action.type, ok: false, error: `unknown action type: ${action.type}` };
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
