import type { ModelAdapter } from "./providerAdapter.js";
import { createOpenAIAdapter } from "./openai.js";
import { createGeminiAdapter } from "./gemini.js";
import { createMockAdapter } from "./mock.js";
import { createOpenRouterAdapter } from "./openrouter.js";

// model_key format: "provider:model-name"
// e.g. "openai:gpt-4o", "openai:gpt-4o-mini", "gemini:gemini-1.5-pro", "openrouter:google/gemini-2.5-flash-lite"

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
    case "openrouter":
      adapter = createOpenRouterAdapter(modelName);
      break;
    case "mock":
      adapter = createMockAdapter(modelName);
      break;
    default:
      throw new Error(`Unknown model provider: "${provider}". Supported: openai, gemini, openrouter, mock.`);
  }

  adapterCache.set(modelKey, adapter);
  return adapter;
}

// Available models for the UI to list
export const AVAILABLE_MODELS = [
  // Gemini models (default)
  { key: "gemini:gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "gemini" },
  { key: "gemini:gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { key: "gemini:gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  // OpenAI models
  { key: "openai:gpt-4o", label: "GPT-4o", provider: "openai" },
  { key: "openai:gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  // OpenRouter models (access to many providers)
  { key: "openrouter:qwen/qwen3.6-plus-preview:free", label: "Qwen 3.6 Plus (Free)", provider: "openrouter" },
  { key: "openrouter:stepfun/step-3.5-flash:free", label: "Step 3.5 Flash (Free)", provider: "openrouter" },
  { key: "openrouter:openai/gpt-oss-120b:free", label: "GPT-OSS 120B (OpenRouter)", provider: "openrouter" },
  { key: "openrouter:nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (OpenRouter)", provider: "openrouter" },
  // Mock for testing
  { key: "mock:mock-default", label: "Mock (Default)", provider: "mock" },
  { key: "mock:mock-fast", label: "Mock (Fast)", provider: "mock" },
];

// Default model for new debates
export const DEFAULT_MODEL_KEY = "gemini:gemini-2.5-flash-lite";
