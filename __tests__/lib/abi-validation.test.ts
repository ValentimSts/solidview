import { describe, it, expect } from "vitest";
import {
  validateAbiItem,
  MAX_ABI_INPUTS,
  MAX_ABI_OUTPUTS,
} from "@/lib/abi-validation";

/** Helper to build a valid ABI item that passes all checks. */
function validAbiItem(overrides: Record<string, unknown> = {}) {
  return {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    ...overrides,
  };
}

describe("abi-validation", () => {
  describe("validateAbiItem", () => {
    it("returns null for a valid view function", () => {
      const item = validAbiItem({ stateMutability: "view" });
      expect(validateAbiItem(item)).toBeNull();
    });

    it("returns null for a valid pure function", () => {
      const item = validAbiItem({ stateMutability: "pure" });
      expect(validateAbiItem(item)).toBeNull();
    });

    it("returns error for null input", () => {
      const result = validateAbiItem(null);
      expect(result).toBe("ABI item must be an object");
    });

    it("returns error for non-object input (string)", () => {
      const result = validateAbiItem("not an object");
      expect(result).toBe("ABI item must be an object");
    });

    it("returns error for wrong type (event)", () => {
      const item = validAbiItem({ type: "event" });
      const result = validateAbiItem(item);
      expect(result).toBe('ABI item must have type "function"');
    });

    it("returns error when name is missing", () => {
      const item = validAbiItem();
      delete (item as Record<string, unknown>).name;
      const result = validateAbiItem(item);
      expect(result).toBe("ABI function must have a name");
    });

    it("returns error when name is empty string", () => {
      const item = validAbiItem({ name: "" });
      const result = validateAbiItem(item);
      expect(result).toBe("ABI function must have a name");
    });

    it("returns error for invalid stateMutability (nonpayable)", () => {
      const item = validAbiItem({ stateMutability: "nonpayable" });
      const result = validateAbiItem(item);
      expect(result).toBe("Only view/pure functions are allowed");
    });

    it("returns error when inputs exceed MAX_ABI_INPUTS", () => {
      const inputs = Array.from({ length: MAX_ABI_INPUTS + 1 }, (_, i) => ({
        name: `arg${i}`,
        type: "uint256",
      }));
      const item = validAbiItem({ inputs });
      const result = validateAbiItem(item);
      expect(result).toBe(
        `ABI inputs must be an array with at most ${MAX_ABI_INPUTS} items`
      );
    });

    it("returns error when outputs exceed MAX_ABI_OUTPUTS", () => {
      const outputs = Array.from({ length: MAX_ABI_OUTPUTS + 1 }, (_, i) => ({
        name: `ret${i}`,
        type: "uint256",
      }));
      const item = validAbiItem({ outputs });
      const result = validateAbiItem(item);
      expect(result).toBe(
        `ABI outputs must be an array with at most ${MAX_ABI_OUTPUTS} items`
      );
    });
  });
});
