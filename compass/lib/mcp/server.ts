import { compassTools } from "@/lib/mcp/tools";
import type { McpTool } from "@/lib/mcp/tools/types";
import { startMcpRun, logMcpAction, finishMcpRun } from "@/lib/mcp/observability";

const MCP_PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "compass-mcp", version: "0.1.0" };
const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
    ? (process.env.COMPASS_CORS_ORIGIN || "null")
    : "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type JsonRpcId = string | number | null;
type JsonRpcMessage = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthorized(request: Request): boolean {
  const expectedToken = process.env.COMPASS_MCP_TOKEN || process.env.HERMES_TOKEN;
  if (!expectedToken) return true;

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expectedToken}`;
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, { ...init, headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) } });
}

function jsonRpcResult(id: JsonRpcId | undefined, result: unknown) {
  if (id === undefined) return null;
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: JsonRpcId | undefined, code: number, message: string, data?: unknown) {
  if (id === undefined) return null;
  return { jsonrpc: "2.0", id, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function objectSchema(properties: Record<string, unknown>, required: string[] = []) {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function toolInputSchema(name: string): Record<string, unknown> {
  switch (name) {
    case "compass.create_capture":
      return objectSchema(
        {
          rawText: { type: "string", description: "Text to put into the inbox." },
          source: { type: "string", description: "Source label, defaults to capture." },
          dimension: { type: "string", description: "Optional life area or category." },
        },
        ["rawText"],
      );
    case "compass.create_goal":
      return objectSchema(
        {
          title: { type: "string" },
          description: { type: "string" },
          dimension: { type: "string" },
          targetDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          status: { type: "string", enum: ["active", "completed", "paused"] },
        },
        ["title"],
      );
    case "compass.update_goal":
      return objectSchema(
        {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          dimension: { type: "string" },
          status: { type: "string", enum: ["active", "completed", "paused"] },
          targetDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          progress: { type: "number", minimum: 0, maximum: 100 },
        },
        ["id"],
      );
    case "compass.update_goal_progress":
      return objectSchema({ id: { type: "string" }, progress: { type: "number", minimum: 0, maximum: 100 } }, ["id", "progress"]);
    case "compass.create_journal_entry":
      return objectSchema(
        {
          title: { type: "string" },
          content: { type: "string" },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          mood: { type: "number", minimum: 1, maximum: 5 },
          tags: { oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }] },
        },
        ["content"],
      );
    case "compass.update_journal_entry":
      return objectSchema(
        {
          id: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          mood: { type: "number", minimum: 1, maximum: 5 },
          tags: { oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }] },
        },
        ["id"],
      );
    case "compass.create_finance_transaction":
      return objectSchema(
        {
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number", exclusiveMinimum: 0 },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          category: { type: "string" },
          note: { type: "string" },
        },
        ["type", "amount"],
      );
    case "compass.create_schedule_item":
      return objectSchema(
        {
          title: { type: "string" },
          description: { type: "string" },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          endTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          evidence: { type: "string" },
          reminderEmail: { type: "string" },
          reminderMinutes: { type: "number", minimum: 0, maximum: 1440 },
          sourceMessageId: { type: "string" },
          source: { type: "string" },
        },
        ["title", "date"],
      );
    case "compass.update_schedule_item":
      return objectSchema(
        {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          endTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          status: { type: "string", enum: ["planned", "done", "cancelled"] },
          reminderEmail: { type: "string" },
          reminderMinutes: { type: "number", minimum: 0, maximum: 1440 },
          completionNote: { type: "string" },
          reviewScore: { type: "number", minimum: 0, maximum: 100 },
          reviewJson: {},
        },
        ["id"],
      );
    case "compass.cancel_schedule_item":
      return objectSchema({ id: { type: "string" } }, ["id"]);
    case "compass.update_capture":
      return objectSchema(
        {
          id: { type: "string" },
          status: { type: "string", enum: ["inbox", "completed", "archived"] },
          dimension: { type: "string" },
        },
        ["id"],
      );
    case "compass.list_schedule_items":
      return objectSchema({
        fromDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        toDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        status: { type: "string", enum: ["planned", "done", "cancelled"] },
      });
    case "compass.save_review":
      return objectSchema(
        {
          period: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          summary: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          sourceId: { type: "string" },
          metrics: {},
          dimensions: {},
        },
        ["body"],
      );
    case "compass.save_insight":
      return objectSchema(
        {
          category: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          evidence: {},
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        ["title", "body"],
      );
    default:
      return { type: "object", additionalProperties: true };
  }
}

function toolDescriptor(tool: McpTool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema ?? toolInputSchema(tool.name),
  };
}

function findTool(name: string) {
  return compassTools.find((item) => item.name === name);
}

async function runTool(name: string, params: Record<string, unknown>) {
  const tool = findTool(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.execute(params);
}

async function handleLegacyToolCall(body: Record<string, unknown>) {
  const name = typeof body.tool === "string" ? body.tool : "";
  if (!name) {
    return json({ ok: false, error: "tool is required" }, { status: 400 });
  }

  const params = isRecord(body.params) ? body.params : {};
  try {
    const result = await runTool(name, params);
    return json({ ok: true, result });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown MCP error",
      },
      { status: 400 },
    );
  }
}

async function handleJsonRpcMessage(message: JsonRpcMessage) {
  const id = message.id;
  const method = message.method;
  const params = isRecord(message.params) ? message.params : {};

  if (message.jsonrpc !== "2.0" || typeof method !== "string") {
    return jsonRpcError(id, -32600, "Invalid JSON-RPC request");
  }

  switch (method) {
    case "initialize":
      return jsonRpcResult(id, {
        protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "notifications/initialized":
      return null;
    case "ping":
      return jsonRpcResult(id, {});
    case "tools/list":
      return jsonRpcResult(id, { tools: compassTools.map(toolDescriptor) });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = isRecord(params.arguments) ? params.arguments : {};
      if (!name) {
        return jsonRpcError(id, -32602, "tools/call params.name is required");
      }

      // T-21: Record MCP tool calls for observability (/operations page)
      let ctx;
      try {
        ctx = await startMcpRun({
          source: "hermes-mcp",
          sessionId: null,
        });
      } catch {
        // If DB logging fails, still execute the tool
        ctx = null;
      }

      try {
        const result = await runTool(name, args);
        const resultObj = result as Record<string, unknown> | null;

        if (ctx) {
          try {
            await logMcpAction(ctx, {
              toolName: name,
              payload: args,
              status: "success",
              resultRefId: resultObj?.id ? String(resultObj.id) : null,
              resultRefTable: null,
            });
            await finishMcpRun(ctx, "completed");
          } catch { /* ignore logging errors */ }
        }

        return jsonRpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
          isError: false,
        });
      } catch (error) {
        if (ctx) {
          try {
            await logMcpAction(ctx, {
              toolName: name,
              payload: args,
              status: "failed",
              errorMessage: error instanceof Error ? error.message : "Unknown MCP error",
            });
            await finishMcpRun(ctx, "failed", error instanceof Error ? error.message : "Unknown MCP error");
          } catch { /* ignore logging errors */ }
        }

        return jsonRpcResult(id, {
          content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown MCP error" }],
          isError: true,
        });
      }
    }
    case "resources/list":
      return jsonRpcResult(id, { resources: [] });
    case "prompts/list":
      return jsonRpcResult(id, { prompts: [] });
    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

export function handleMcpOptions(): Response {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  if (request.method === "GET") {
    return json({
      server: SERVER_INFO.name,
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      tools: compassTools.map(toolDescriptor),
      legacy: {
        call: "POST /api/mcp with { tool: string, params?: object }",
      },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  if (isRecord(body) && typeof body.tool === "string") {
    return handleLegacyToolCall(body);
  }

  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map((item) => (isRecord(item) ? handleJsonRpcMessage(item) : jsonRpcError(null, -32600, "Invalid JSON-RPC request"))))).filter(Boolean);
    return responses.length > 0 ? json(responses) : new Response(null, { status: 202, headers: JSON_HEADERS });
  }

  if (isRecord(body)) {
    const response = await handleJsonRpcMessage(body);
    return response ? json(response) : new Response(null, { status: 202, headers: JSON_HEADERS });
  }

  return json({ error: "invalid_request" }, { status: 400 });
}
