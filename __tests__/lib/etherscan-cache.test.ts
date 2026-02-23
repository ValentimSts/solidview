import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchContractAbi,
  fetchContractSource,
  clearEtherscanCache,
} from "@/lib/etherscan";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const CHAIN_ID = 1;

/** Create a mock fetch response for a successful ABI request. */
function mockAbiResponse(abi: unknown[] = [{ type: "function", name: "test" }]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        status: "1",
        result: JSON.stringify(abi),
      }),
  };
}

/** Create a mock fetch response for a successful source request. */
function mockSourceResponse(name = "Foo") {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        status: "1",
        result: [
          {
            SourceCode: "pragma solidity ^0.8.0;",
            ContractName: name,
            CompilerVersion: "v0.8.20",
            OptimizationUsed: "1",
            Runs: "200",
            LicenseType: "MIT",
            EVMVersion: "paris",
          },
        ],
      }),
  };
}

describe("etherscan cache", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ETHERSCAN_API_KEY", "test-key");
    clearEtherscanCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cached result on second call without fetching again", async () => {
    mockFetch.mockResolvedValueOnce(mockAbiResponse());

    await fetchContractAbi(CHAIN_ID, TEST_ADDRESS);
    const result = await fetchContractAbi(CHAIN_ID, TEST_ADDRESS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ type: "function", name: "test" }]);
  });

  it("evicts expired entries after 24h TTL", async () => {
    vi.useFakeTimers();

    mockFetch.mockResolvedValueOnce(
      mockAbiResponse([{ type: "function", name: "first" }])
    );
    await fetchContractAbi(CHAIN_ID, TEST_ADDRESS);

    // Advance past the 24h TTL
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    mockFetch.mockResolvedValueOnce(
      mockAbiResponse([{ type: "function", name: "second" }])
    );
    const result = await fetchContractAbi(CHAIN_ID, TEST_ADDRESS);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ type: "function", name: "second" }]);
  });

  it("normalizes address case so mixed-case hits the same cache entry", async () => {
    const upperAddr = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
    const lowerAddr = "0xabcdef1234567890abcdef1234567890abcdef12";

    mockFetch.mockResolvedValueOnce(mockAbiResponse());

    await fetchContractAbi(CHAIN_ID, upperAddr);
    await fetchContractAbi(CHAIN_ID, lowerAddr);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("evicts the oldest entry when cache exceeds 500 entries", async () => {
    const firstAddress = `0x${"0".repeat(38)}00`;

    // Fill cache with 501 entries (0..500), so entry 0 gets evicted
    for (let i = 0; i <= 500; i++) {
      const addr = `0x${"0".repeat(38)}${String(i).padStart(2, "0")}`;
      mockFetch.mockResolvedValueOnce(mockAbiResponse());
      await fetchContractAbi(CHAIN_ID, addr);
    }

    // At this point entry 0 should have been evicted by entry 500
    expect(mockFetch).toHaveBeenCalledTimes(501);

    // Fetching the first address again should trigger a new fetch (cache miss)
    mockFetch.mockResolvedValueOnce(mockAbiResponse());
    await fetchContractAbi(CHAIN_ID, firstAddress);

    expect(mockFetch).toHaveBeenCalledTimes(502);
  });

  it("caches ABI and source independently", async () => {
    mockFetch.mockResolvedValueOnce(mockAbiResponse());
    await fetchContractAbi(CHAIN_ID, TEST_ADDRESS);

    // Source should not be served from ABI cache — needs its own fetch
    mockFetch.mockResolvedValueOnce(mockSourceResponse());
    await fetchContractSource(CHAIN_ID, TEST_ADDRESS);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("clears all entries when clearEtherscanCache is called", async () => {
    mockFetch.mockResolvedValueOnce(mockAbiResponse());
    await fetchContractAbi(CHAIN_ID, TEST_ADDRESS);

    clearEtherscanCache();

    mockFetch.mockResolvedValueOnce(mockAbiResponse());
    await fetchContractAbi(CHAIN_ID, TEST_ADDRESS);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
