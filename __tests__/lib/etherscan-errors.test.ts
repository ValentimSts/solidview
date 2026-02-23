import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchContractAbi,
  clearEtherscanCache,
  EtherscanError,
} from "@/lib/etherscan";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const CHAIN_ID = 1;

describe("etherscan error handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ETHERSCAN_API_KEY", "test-key");
    clearEtherscanCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws EtherscanError with status code on 500 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      fetchContractAbi(CHAIN_ID, TEST_ADDRESS)
    ).rejects.toThrow(EtherscanError);

    await mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      fetchContractAbi(CHAIN_ID, TEST_ADDRESS)
    ).rejects.toThrow("500");
  });

  it("throws EtherscanError with status code on 429 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    await expect(
      fetchContractAbi(CHAIN_ID, TEST_ADDRESS)
    ).rejects.toThrow(EtherscanError);

    // Clear cache so we can hit the same address again
    clearEtherscanCache();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    await expect(
      fetchContractAbi(CHAIN_ID, TEST_ADDRESS)
    ).rejects.toThrow("429");
  });

  it("throws when fetch rejects with a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("timeout"));

    await expect(
      fetchContractAbi(CHAIN_ID, TEST_ADDRESS)
    ).rejects.toThrow("timeout");
  });

  it("throws when response has malformed JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    await expect(
      fetchContractAbi(CHAIN_ID, TEST_ADDRESS)
    ).rejects.toThrow(SyntaxError);
  });

  it("throws EtherscanError when ETHERSCAN_API_KEY is not configured", async () => {
    vi.unstubAllEnvs();
    delete process.env.ETHERSCAN_API_KEY;

    await expect(
      fetchContractAbi(CHAIN_ID, TEST_ADDRESS)
    ).rejects.toThrow("ETHERSCAN_API_KEY is not configured");
  });
});
