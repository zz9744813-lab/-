export type McpTool = {
  name: string;
  description: string;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
};
