import { getCatalog } from "./catalog-cache.js";

/**
 * Result of validating model keys against the catalog.
 */
export type ModelKeyValidationResult =
  | { valid: true }
  | { valid: false; invalidKeys: string[] };

/**
 * Validates that the provided model keys exist in the runtime catalog.
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

  const invalidKeys: string[] = [];

  for (const key of keys) {
    if (key !== undefined && key !== null && !allowedKeys.has(key)) {
      invalidKeys.push(key);
    }
  }

  if (invalidKeys.length === 0) {
    return { valid: true };
  }

  return { valid: false, invalidKeys };
}