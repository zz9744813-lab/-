export type McpTool = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
};
