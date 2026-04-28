export type BrainProvider = "disabled" | "hermes-bridge" | "openai-compatible";

export type BrainRuntimeConfig = {
  provider: BrainProvider;
  hermesBridgeUrl?: string;
  hermesBridgeToken?: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
  aiModel?: string;
};

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
