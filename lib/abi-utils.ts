import type { Abi, AbiEvent, AbiFunction } from "viem";

export interface ParsedAbi {
  readFunctions: AbiFunction[];
  writeFunctions: AbiFunction[];
  events: AbiEvent[];
}

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

export function formatParamType(type: string): string {
  return type;
}
