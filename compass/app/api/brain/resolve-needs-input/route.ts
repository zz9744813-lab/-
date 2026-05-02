import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { brainActions, brainRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendBrainMessage } from "@/lib/brain/client";
import { loadBrainConfigFromStore } from "@/lib/brain/settings-store";
import { validateAction } from "@/lib/brain/action-schemas";
import { compassTools } from "@/lib/mcp/tools";

export async function POST(request: Request) {
  try {
    const { actionId, userReply } = await request.json();
    
    if (!actionId || !userReply) {
      return NextResponse.json({ ok: false, error: "Missing actionId or userReply" }, { status: 400 });
    }

    const [action] = await db.select().from(brainActions).where(eq(brainActions.id, actionId));
    if (!action || action.status !== 'needs_input') {
      return NextResponse.json({ ok: false, error: "Invalid action or not needs_input" }, { status: 400 });
    }

    const [run] = await db.select().from(brainRuns).where(eq(brainRuns.id, action.runId));
    if (!run) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 400 });
    }

    await db.update(brainActions).set({ status: 'cancelled' }).where(eq(brainActions.id, actionId));

    const prompt = `
你之前尝试执行 ${action.type} 动作，但是缺少字段。
原始 draft JSON: ${action.payloadJson}
缺少的字段: ${action.missingFieldsJson}
用户的回答: ${userReply}

请补全缺失的字段，并输出一个合法的 JSON ACTION 块：
[[ACTION:${action.type}]]
{...}
[[/ACTION]]
`;

    const config = await loadBrainConfigFromStore();
    const result = await sendBrainMessage(prompt, { page: 'resolve-needs-input' }, config);
    
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    const actionMatch = result.response.match(/\[\[ACTION:(.*?)\]\]\s*([\s\S]*?)\s*\[\[\/ACTION\]\]/i);
    if (!actionMatch) {
       return NextResponse.json({ ok: false, error: "Failed to parse brain response." }, { status: 500 });
    }

    const actionType = actionMatch[1].trim();
    const actionPayload = JSON.parse(actionMatch[2].trim());
    
    const valid = validateAction(actionType, actionPayload);
    const newActionId = crypto.randomUUID();

    if (!valid.ok) {
      await db.insert(brainActions).values({
        id: newActionId,
        runId: run.id,
        type: actionType,
        payloadJson: JSON.stringify(actionPayload),
        status: 'failed',
        errorMessage: valid.errors.join("; ")
      });
      return NextResponse.json({ ok: false, error: valid.errors.join("; ") });
    }

    const toolName = `compass.${actionType}`;
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
      id: newActionId,
      runId: run.id,
      type: actionType,
      payloadJson: JSON.stringify(valid.data),
      status: actionStatus,
      resultRefId,
      errorMessage: errMsg
    });

    return NextResponse.json({ ok: actionStatus === 'success', resultRefId, error: errMsg });

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
