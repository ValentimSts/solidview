import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchContractAbi, fetchContractSource, clearEtherscanCache } from "@/lib/etherscan";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("etherscan", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ETHERSCAN_API_KEY", "test-key");
    clearEtherscanCache();
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
        1,
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
          1,
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
        1,
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
        1,
        "0x1234567890123456789012345678901234567890"
      );

      expect(Object.keys(result.source.files)).toHaveLength(2);
      expect(result.source.files["contracts/Foo.sol"]).toBe(
        "pragma solidity ^0.8.0;"
      );
    });

    it("detects Vyper language from compiler version", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: [
            {
              SourceCode: "# @version 0.3.7\n@external\ndef foo() -> uint256:\n    return 1",
              ContractName: "VyperContract",
              CompilerVersion: "vyper:0.3.7",
              OptimizationUsed: "0",
              Runs: "200",
              LicenseType: "MIT",
              EVMVersion: "default",
            },
          ],
        }),
      });

      const result = await fetchContractSource(
        1,
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.source.language).toBe("Vyper");
      expect(result.source.files).toHaveProperty("VyperContract.vy");
      expect(result.source.files).not.toHaveProperty("VyperContract.sol");
    });

    it("detects Vyper language for multi-file JSON source", async () => {
      const multiSource = JSON.stringify({
        sources: {
          "contracts/VyperContract.vy": { content: "# @version 0.3.7" },
          "interfaces/IFoo.vy": { content: "# interface" },
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: [
            {
              SourceCode: `{${multiSource}}`,
              ContractName: "VyperContract",
              CompilerVersion: "vyper:0.3.7",
              OptimizationUsed: "0",
              Runs: "200",
              LicenseType: "MIT",
              EVMVersion: "default",
            },
          ],
        }),
      });

      const result = await fetchContractSource(
        1,
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.source.language).toBe("Vyper");
      expect(Object.keys(result.source.files)).toHaveLength(2);
      expect(result.source.files["contracts/VyperContract.vy"]).toBe(
        "# @version 0.3.7"
      );
    });
  });
});
