export type BrainProvider = "disabled" | "hermes-bridge" | "openai-compatible";

export type BrainStatus = {
  provider: BrainProvider;
  configured: boolean;
  missingVars: string[];
  statusText: string;
};

export type BrainMessageResult = {
  ok: boolean;
  provider: BrainProvider;
  response: string;
  error?: string;
};
