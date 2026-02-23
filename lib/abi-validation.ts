export const MAX_ABI_INPUTS = 20;
export const MAX_ABI_OUTPUTS = 20;
export const ALLOWED_STATE_MUTABILITY = new Set(["view", "pure"]);

export function validateAbiItem(item: unknown): string | null {
  if (typeof item !== "object" || item === null) return "ABI item must be an object";
  const obj = item as Record<string, unknown>;
  if (obj.type !== "function") return 'ABI item must have type "function"';
  if (typeof obj.name !== "string" || obj.name.length === 0) return "ABI function must have a name";
  if (typeof obj.stateMutability !== "string" || !ALLOWED_STATE_MUTABILITY.has(obj.stateMutability)) {
    return "Only view/pure functions are allowed";
  }
  if (!Array.isArray(obj.inputs) || obj.inputs.length > MAX_ABI_INPUTS) {
    return `ABI inputs must be an array with at most ${MAX_ABI_INPUTS} items`;
  }
  if (!Array.isArray(obj.outputs) || obj.outputs.length > MAX_ABI_OUTPUTS) {
    return `ABI outputs must be an array with at most ${MAX_ABI_OUTPUTS} items`;
  }
  return null;
}
