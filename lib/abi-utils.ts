import type { Abi, AbiEvent, AbiFunction } from "viem";

/**
 * A contract ABI split into categorized, alphabetically sorted groups.
 * Produced by {@link parseContractAbi}.
 */
export interface ParsedAbi {
  readFunctions: AbiFunction[];
  writeFunctions: AbiFunction[];
  events: AbiEvent[];
}

/**
 * Parses a raw ABI into read functions, write functions, and events.
 * Each category is sorted alphabetically by name.
 * @param abi - A viem-typed ABI array.
 * @returns A {@link ParsedAbi} with categorized and sorted entries.
 */
export function parseContractAbi(abi: Abi): ParsedAbi {
  const readFunctions: AbiFunction[] = [];
  const writeFunctions: AbiFunction[] = [];
  const events: AbiEvent[] = [];

  for (const item of abi) {
    if (item.type === "function") {
      if (item.stateMutability === "view" || item.stateMutability === "pure") {
        readFunctions.push(item);
      } else {
        writeFunctions.push(item);
      }
    } else if (item.type === "event") {
      events.push(item);
    }
  }

  readFunctions.sort((a, b) => a.name.localeCompare(b.name));
  writeFunctions.sort((a, b) => a.name.localeCompare(b.name));
  events.sort((a, b) => a.name.localeCompare(b.name));

  return { readFunctions, writeFunctions, events };
}