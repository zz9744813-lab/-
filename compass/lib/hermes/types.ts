export type HermesRole = "system" | "user" | "assistant";

export type HermesMessage = {
  role: HermesRole;
  content: string;
};

export type HermesEvent =
  | { type: "token"; token: string }
  | { type: "tool_call"; name: string; input?: unknown }
  | { type: "tool_result"; name: string; output?: unknown }
  | { type: "done"; content?: string; threadId?: string }
  | { type: "error"; error: string };

export type HermesChatRequest = {
  messages: HermesMessage[];
  source: "web" | "capture" | "cron";
  threadId?: string;
};

export type HermesResponse = {
  content: string;
  threadId?: string;
};
