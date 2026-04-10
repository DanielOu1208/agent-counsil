import { AVAILABLE_MODELS, DEFAULT_MODEL_KEY } from "./registry.js";

// Types
export interface ApiModel {
  key: string;
  label: string;
  provider: string;
}

export interface Catalog {
  models: ApiModel[];
  defaultModelKey: string;
}

interface OpenRouterModel {
  id: string;
  name?: string;
}

interface OpenRouterResponse {
  data?: OpenRouterModel[];
}

// Cache state
let cachedCatalog: Catalog | null = null;
let lastFetchedAt: number = 0;
let inFlightRefreshPromise: Promise<Catalog> | null = null;

// TTL = 6 hours in milliseconds
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Fetch timeout in milliseconds
const FETCH_TIMEOUT_MS = 15000;

/**
 * Fetch models from OpenRouter API with timeout
 */
async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API returned ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    return data.data ?? [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Normalize OpenRouter models to ApiModel shape
 * Key format: "openrouter:<model-id>"
 */
function normalizeModels(models: OpenRouterModel[]): ApiModel[] {
  return models.map((model) => ({
    key: `openrouter:${model.id}`,
    label: model.name ?? model.id,
    provider: "openrouter",
  }));
}

/**
 * Create static fallback catalog from registry constants
 */
function getStaticFallback(): Catalog {
  return {
    models: [...AVAILABLE_MODELS],
    defaultModelKey: DEFAULT_MODEL_KEY,
  };
}

/**
 * Ensure defaultModelKey exists in models, otherwise use first model
 */
function ensureValidDefault(catalog: Catalog): Catalog {
  if (catalog.models.length === 0) {
    return getStaticFallback();
  }

  const hasValidDefault = catalog.models.some((m) => m.key === catalog.defaultModelKey);
  if (!hasValidDefault) {
    return {
      ...catalog,
      defaultModelKey: catalog.models[0].key,
    };
  }

  return catalog;
}

/**
 * Refresh catalog from OpenRouter API
 */
async function refreshCatalog(): Promise<Catalog> {
  try {
    const models = await fetchOpenRouterModels();
    
    if (models.length === 0) {
      console.warn("[catalog-cache] OpenRouter returned empty models list, using static fallback");
      return getStaticFallback();
    }

    const normalizedModels = normalizeModels(models);
    
    // Find a suitable default model
    // Prefer the current DEFAULT_MODEL_KEY if it exists in the catalog
    const catalog: Catalog = {
      models: normalizedModels,
      defaultModelKey: DEFAULT_MODEL_KEY,
    };

    const result = ensureValidDefault(catalog);
    console.log(`[catalog-cache] Successfully refreshed ${result.models.length} models from OpenRouter`);
    return result;
  } catch (error) {
    console.error("[catalog-cache] Failed to fetch from OpenRouter:", error);
    throw error;
  }
}

/**
 * Get the model catalog.
 * 
 * Behavior:
 * - Fresh cache (<6h): return cache
 * - Stale/missing: refresh from OpenRouter (single in-flight promise dedupe)
 * - Refresh fail + stale exists: return stale
 * - Refresh fail + no cache: return static fallback
 */
export async function getCatalog(): Promise<Catalog> {
  const now = Date.now();
  const isFresh = cachedCatalog !== null && (now - lastFetchedAt) < CACHE_TTL_MS;

  // Fresh cache: return immediately
  if (isFresh) {
    return cachedCatalog!;
  }

  // If refresh is already in-flight, wait for it
  if (inFlightRefreshPromise) {
    console.log("[catalog-cache] Waiting for in-flight refresh");
    try {
      return await inFlightRefreshPromise;
    } catch {
      // If in-flight fails and we have stale cache, return it
      if (cachedCatalog) {
        console.log("[catalog-cache] In-flight refresh failed, returning stale cache");
        return cachedCatalog;
      }
      // Otherwise use static fallback
      console.log("[catalog-cache] In-flight refresh failed, returning static fallback");
      return getStaticFallback();
    }
  }

  // Start a refresh
  inFlightRefreshPromise = refreshCatalog();

  try {
    const catalog = await inFlightRefreshPromise;
    cachedCatalog = catalog;
    lastFetchedAt = Date.now();
    return catalog;
  } catch (error) {
    // Refresh failed
    if (cachedCatalog) {
      console.log("[catalog-cache] Refresh failed, returning stale cache");
      return cachedCatalog;
    }
    console.log("[catalog-cache] Refresh failed, returning static fallback");
    return getStaticFallback();
  } finally {
    inFlightRefreshPromise = null;
  }
}
