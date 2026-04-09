import type { ModelAdapter } from "./providerAdapter.js";
import { createOpenAIAdapter } from "./openai.js";
import { createMockAdapter } from "./mock.js";
import { createOpenRouterAdapter } from "./openrouter.js";

// model_key format: "provider:model-name"
// e.g. "openai:gpt-4o", "openai:gpt-4o-mini", "openrouter:stepfun/step-3.5-flash"

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
    case "openrouter":
      adapter = createOpenRouterAdapter(modelName);
      break;
    case "mock":
      adapter = createMockAdapter(modelName);
      break;
    default:
      throw new Error(`Unknown model provider: "${provider}". Supported: openai, openrouter, mock.`);
  }

  adapterCache.set(modelKey, adapter);
  return adapter;
}

// Available models for the UI to list
export const AVAILABLE_MODELS = [
  // OpenRouter models (default)
  { key: "openrouter:stepfun/step-3.5-flash", label: "Step 3.5 Flash", provider: "openrouter" },
  { key: "openrouter:deepseek/deepseek-v3.2", label: "DeepSeek V3.2", provider: "openrouter" },
  { key: "openrouter:qwen/qwen3.6-plus", label: "Qwen 3.6 Plus", provider: "openrouter" },
  { key: "openrouter:moonshotai/kimi-k2.5", label: "Kimi K2.5", provider: "openrouter" },
  
  // OpenAI models
  { key: "openai:gpt-4o", label: "GPT-4o", provider: "openai" },
  { key: "openai:gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  // Mock for testing
  { key: "mock:mock-default", label: "Mock (Default)", provider: "mock" },
  { key: "mock:mock-fast", label: "Mock (Fast)", provider: "mock" },
];

// Default model for new debates
export const DEFAULT_MODEL_KEY = "openrouter:stepfun/step-3.5-flash";
