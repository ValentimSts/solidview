import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchContractAbi, fetchContractSource } from "@/lib/etherscan";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("etherscan", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchContractAbi", () => {
    it("returns parsed ABI for a verified contract", async () => {
      const fakeAbi = [
        {
          type: "function",
          name: "balanceOf",
          inputs: [{ name: "owner", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: JSON.stringify(fakeAbi),
        }),
      });

      const abi = await fetchContractAbi(
        "https://api.etherscan.io/api",
        "test-key",
        "0x1234567890123456789012345678901234567890"
      );

      expect(abi).toEqual(fakeAbi);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("throws when contract is not verified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "0",
          result: "Contract source code not verified",
        }),
      });

      await expect(
        fetchContractAbi(
          "https://api.etherscan.io/api",
          "test-key",
          "0x1234567890123456789012345678901234567890"
        )
      ).rejects.toThrow("Contract source code not verified");
    });
  });

  describe("fetchContractSource", () => {
    it("returns source code and metadata", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: [
            {
              SourceCode: "pragma solidity ^0.8.0; contract Foo {}",
              ContractName: "Foo",
              CompilerVersion: "v0.8.20",
              OptimizationUsed: "1",
              Runs: "200",
              LicenseType: "MIT",
              EVMVersion: "paris",
            },
          ],
        }),
      });

      const result = await fetchContractSource(
        "https://api.etherscan.io/api",
        "test-key",
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.metadata.name).toBe("Foo");
      expect(result.metadata.compilerVersion).toBe("v0.8.20");
      expect(result.metadata.optimizationUsed).toBe(true);
      expect(result.metadata.runs).toBe(200);
      expect(result.source.files).toHaveProperty("Foo.sol");
    });

    it("handles multi-file contracts (JSON source)", async () => {
      const multiSource = JSON.stringify({
        sources: {
          "contracts/Foo.sol": { content: "pragma solidity ^0.8.0;" },
          "contracts/Bar.sol": { content: "import './Foo.sol';" },
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: [
            {
              SourceCode: `{${multiSource}}`,
              ContractName: "Foo",
              CompilerVersion: "v0.8.20",
              OptimizationUsed: "0",
              Runs: "200",
              LicenseType: "MIT",
              EVMVersion: "paris",
            },
          ],
        }),
      });

      const result = await fetchContractSource(
        "https://api.etherscan.io/api",
        "test-key",
        "0x1234567890123456789012345678901234567890"
      );

      expect(Object.keys(result.source.files)).toHaveLength(2);
      expect(result.source.files["contracts/Foo.sol"]).toBe(
        "pragma solidity ^0.8.0;"
      );
    });
  });
});
