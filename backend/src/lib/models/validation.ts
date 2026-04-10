import { getCatalog } from "./catalog-cache.js";
import { migrateModelKey } from "./registry.js";

/**
 * Result of validating model keys against the catalog.
 */
export type ModelKeyValidationResult =
  | { valid: true; migratedKeys?: Map<string, string> }
  | { valid: false; invalidKeys: string[] };

/**
 * Validates that the provided model keys exist in the runtime catalog.
 * Also handles migration of legacy openai:* and mock:* keys to OpenRouter equivalents.
 * Uses a Set for O(1) lookup performance.
 *
 * @param keys - Array of model keys to validate (can be empty or contain undefined/null)
 * @returns Validation result indicating success or list of invalid keys
 */
export async function validateModelKeys(
  keys: (string | undefined | null)[],
): Promise<ModelKeyValidationResult> {
  const catalog = await getCatalog();
  const allowedKeys = new Set(catalog.models.map((m) => m.key));
  const migratedKeys = new Map<string, string>();

  const invalidKeys: string[] = [];

  for (const rawKey of keys) {
    if (rawKey === undefined || rawKey === null) {
      continue;
    }

    // First, migrate legacy keys
    const migratedKey = migrateModelKey(rawKey);
    
    // Track if migration happened
    if (migratedKey !== rawKey) {
      migratedKeys.set(rawKey, migratedKey);
    }

    // Validate the (possibly migrated) key
    if (!allowedKeys.has(migratedKey)) {
      // If the migrated key is still not valid, check if it's an OpenRouter model
      // that might be dynamically fetched from the API
      if (migratedKey.startsWith("openrouter:")) {
        // Allow openrouter: keys that might be from the live API
        // The catalog should contain all available models
        // If it's not in the catalog, it's invalid
        invalidKeys.push(rawKey);
      } else {
        invalidKeys.push(rawKey);
      }
    }
  }

  if (invalidKeys.length === 0) {
    return { valid: true, migratedKeys: migratedKeys.size > 0 ? migratedKeys : undefined };
  }

  return { valid: false, invalidKeys };
}