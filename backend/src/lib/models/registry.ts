import type { ModelAdapter } from "./providerAdapter.js";
import { createOpenRouterAdapter } from "./openrouter.js";

// model_key format: "provider:model-name"
// e.g. "openrouter:openai/gpt-4o", "openrouter:anthropic/claude-3.5-sonnet"

const adapterCache = new Map<string, ModelAdapter>();

/**
 * Migrates legacy model keys to OpenRouter equivalents.
 * - openai:* -> openrouter:openai/<model>
 * - mock:* -> default OpenRouter model
 */
export function migrateModelKey(modelKey: string): string {
  if (!modelKey) return DEFAULT_MODEL_KEY;
  
  // Handle legacy openai:* keys
  if (modelKey.startsWith("openai:")) {
    const modelName = modelKey.slice(7); // Remove "openai:" prefix
    // Map to openrouter format
    return `openrouter:openai/${modelName}`;
  }
  
  // Handle legacy mock:* keys - migrate to default
  if (modelKey.startsWith("mock:")) {
    return DEFAULT_MODEL_KEY;
  }
  
  return modelKey;
}

export function getModelAdapter(modelKey: string): ModelAdapter {
  // Migrate legacy keys
  const migratedKey = migrateModelKey(modelKey);
  
  const cached = adapterCache.get(migratedKey);
  if (cached) return cached;

  const [provider, ...rest] = migratedKey.split(":");
  const modelName = rest.join(":");

  if (!provider || !modelName) {
    throw new Error(`Invalid model key format: "${migratedKey}". Expected "openrouter:model-name".`);
  }

  let adapter: ModelAdapter;

  if (provider === "openrouter") {
    adapter = createOpenRouterAdapter(modelName);
  } else {
    throw new Error(`Unknown model provider: "${provider}". Only "openrouter" is supported.`);
  }

  adapterCache.set(migratedKey, adapter);
  return adapter;
}

// Available models for the UI to list (OpenRouter only)
export const AVAILABLE_MODELS = [
  { key: "openrouter:stepfun/step-3.5-flash", label: "Step 3.5 Flash", provider: "openrouter" },
  { key: "openrouter:deepseek/deepseek-v3.2", label: "DeepSeek V3.2", provider: "openrouter" },
  { key: "openrouter:qwen/qwen3.6-plus", label: "Qwen 3.6 Plus", provider: "openrouter" },
  { key: "openrouter:moonshotai/kimi-k2.5", label: "Kimi K2.5", provider: "openrouter" },
  { key: "openrouter:openai/gpt-4o-mini", label: "GPT-4o Mini (via OpenRouter)", provider: "openrouter" },
];

// Default model for new debates
export const DEFAULT_MODEL_KEY = "openrouter:stepfun/step-3.5-flash";