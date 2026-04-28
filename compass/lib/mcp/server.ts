import { compassTools } from "@/lib/mcp/tools";

function isAuthorized(request: Request): boolean {
  const expectedToken = process.env.HERMES_TOKEN;
  if (!expectedToken) return true;

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expectedToken}`;
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (request.method === "GET") {
    return Response.json({
      server: "compass-mcp",
      tools: compassTools.map((tool) => ({ name: tool.name, description: tool.description })),
    });
  }

  const body = (await request.json()) as {
    tool?: string;
    params?: Record<string, unknown>;
  };

  const tool = compassTools.find((item) => item.name === body.tool);
  if (!tool) {
    return Response.json({ error: "tool_not_found" }, { status: 404 });
  }

  try {
    const result = await tool.execute(body.params ?? {});
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown MCP error",
      },
      { status: 400 },
    );
  }
}
