import type { ModelAdapter } from "./providerAdapter.js";
import { createOpenAIAdapter } from "./openai.js";
import { createGeminiAdapter } from "./gemini.js";
import { createMockAdapter } from "./mock.js";

// model_key format: "provider:model-name"
// e.g. "openai:gpt-4o", "openai:gpt-4o-mini", "gemini:gemini-1.5-pro", "mock:mock-fast"

const adapterCache = new Map<string, ModelAdapter>();

export function getModelAdapter(modelKey: string): ModelAdapter {
  const cached = adapterCache.get(modelKey);
  if (cached) return cached;

  const [provider, ...rest] = modelKey.split(":");
  const modelName = rest.join(":");

  if (!provider || !modelName) {
    throw new Error(`Invalid model key format: "${modelKey}". Expected "provider:model-name".`);
  }

  let adapter: ModelAdapter;

  switch (provider) {
    case "openai":
      adapter = createOpenAIAdapter(modelName);
      break;
    case "gemini":
      adapter = createGeminiAdapter(modelName);
      break;
    case "mock":
      adapter = createMockAdapter(modelName);
      break;
    default:
      throw new Error(`Unknown model provider: "${provider}". Supported: openai, gemini, mock.`);
  }

  adapterCache.set(modelKey, adapter);
  return adapter;
}

// Available models for the UI to list
export const AVAILABLE_MODELS = [
  { key: "openai:gpt-4o", label: "GPT-4o", provider: "openai" },
  { key: "openai:gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { key: "gemini:gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { key: "gemini:gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  { key: "mock:mock-default", label: "Mock (Default)", provider: "mock" },
  { key: "mock:mock-fast", label: "Mock (Fast)", provider: "mock" },
];
