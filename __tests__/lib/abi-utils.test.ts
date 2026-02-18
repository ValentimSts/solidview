import { describe, it, expect } from "vitest";
import type { Abi } from "viem";
import { parseContractAbi, formatParamType } from "@/lib/abi-utils";

const sampleAbi: Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
    stateMutability: "pure",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      { name: "to", type: "address", indexed: true, internalType: "address" },
      {
        name: "value",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "spender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "value",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
  },
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
];

describe("abi-utils", () => {
  describe("parseContractAbi", () => {
    it("separates read functions (view + pure)", () => {
      const { readFunctions } = parseContractAbi(sampleAbi);
      expect(readFunctions).toHaveLength(3);
      expect(readFunctions.map((f) => f.name).sort()).toEqual([
        "balanceOf",
        "decimals",
        "name",
      ]);
    });

    it("separates write functions (nonpayable + payable)", () => {
      const { writeFunctions } = parseContractAbi(sampleAbi);
      expect(writeFunctions).toHaveLength(1);
      expect(writeFunctions[0].name).toBe("transfer");
    });

    it("extracts events", () => {
      const { events } = parseContractAbi(sampleAbi);
      expect(events).toHaveLength(2);
      expect(events.map((e) => e.name).sort()).toEqual([
        "Approval",
        "Transfer",
      ]);
    });

    it("ignores non-function/event entries", () => {
      const { readFunctions, writeFunctions, events } =
        parseContractAbi(sampleAbi);
      const total =
        readFunctions.length + writeFunctions.length + events.length;
      expect(total).toBe(6);
    });

    it("handles empty ABI", () => {
      const { readFunctions, writeFunctions, events } = parseContractAbi([]);
      expect(readFunctions).toHaveLength(0);
      expect(writeFunctions).toHaveLength(0);
      expect(events).toHaveLength(0);
    });
  });

  describe("formatParamType", () => {
    it("formats address type", () => {
      expect(formatParamType("address")).toBe("address");
    });

    it("formats uint256 type", () => {
      expect(formatParamType("uint256")).toBe("uint256");
    });

    it("formats array types", () => {
      expect(formatParamType("uint256[]")).toBe("uint256[]");
    });

    it("formats tuple types", () => {
      expect(formatParamType("tuple")).toBe("tuple");
    });
  });
});
