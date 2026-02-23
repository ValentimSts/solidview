import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/etherscan", () => ({
  fetchContractAbi: vi.fn(),
  fetchContractSource: vi.fn(),
  EtherscanError: class EtherscanError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "EtherscanError";
    }
  },
}));

import { GET } from "@/app/api/contract/[chain]/[address]/route";
import {
  fetchContractAbi,
  fetchContractSource,
  EtherscanError,
} from "@/lib/etherscan";

const VALID_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const mockAbi = [{ type: "function", name: "balanceOf" }];
const mockMetadata = { name: "Tether", compilerVersion: "v0.8.20" };
const mockSource = { files: { "Tether.sol": "..." }, language: "Solidity" };

function makeRequest(headers?: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/contract/ethereum/" + VALID_ADDRESS, {
    headers: headers ?? {},
  });
}

function makeParams(chain: string, address: string) {
  return { params: Promise.resolve({ chain, address }) };
}

describe("GET /api/contract/[chain]/[address]", () => {
  beforeEach(() => {
    vi.stubEnv("ETHERSCAN_API_KEY", "test-api-key-12345");
    vi.clearAllMocks();

    (fetchContractAbi as ReturnType<typeof vi.fn>).mockResolvedValue(mockAbi);
    (fetchContractSource as ReturnType<typeof vi.fn>).mockResolvedValue({
      metadata: mockMetadata,
      source: mockSource,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 for an invalid chain", async () => {
    const res = await GET(makeRequest(), makeParams("solana", VALID_ADDRESS));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Unsupported chain: solana");
  });

  it("returns 400 for an invalid address", async () => {
    const res = await GET(makeRequest(), makeParams("ethereum", "0xINVALID"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid Ethereum address");
  });

  it("returns 400 for an invalid API key format", async () => {
    const req = new Request("http://localhost:3000/api/contract/ethereum/" + VALID_ADDRESS, {
      headers: { "x-api-key": "short" },
    });
    const res = await GET(req, makeParams("ethereum", VALID_ADDRESS));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid API key format");
  });

  it("returns 500 when no API key is available", async () => {
    vi.unstubAllEnvs();
    delete process.env.ETHERSCAN_API_KEY;

    const res = await GET(makeRequest(), makeParams("ethereum", VALID_ADDRESS));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Etherscan API key not configured");
  });

  it("returns 200 with abi, metadata, and source on success", async () => {
    const res = await GET(makeRequest(), makeParams("ethereum", VALID_ADDRESS));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.abi).toEqual(mockAbi);
    expect(body.metadata).toEqual(mockMetadata);
    expect(body.source).toEqual(mockSource);
  });

  it("uses x-api-key header over env variable", async () => {
    const headerKey = "client-header-api-key-99";
    const req = new Request("http://localhost:3000/api/contract/ethereum/" + VALID_ADDRESS, {
      headers: { "x-api-key": headerKey },
    });
    await GET(req, makeParams("ethereum", VALID_ADDRESS));
    expect(fetchContractAbi).toHaveBeenCalledWith(1, VALID_ADDRESS, headerKey);
  });

  it("includes Cache-Control header on success response", async () => {
    const res = await GET(makeRequest(), makeParams("ethereum", VALID_ADDRESS));
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
    );
  });

  it("returns 404 with EtherscanError message", async () => {
    (fetchContractAbi as ReturnType<typeof vi.fn>).mockRejectedValue(
      new EtherscanError("Contract source code not verified")
    );
    const res = await GET(makeRequest(), makeParams("ethereum", VALID_ADDRESS));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Contract source code not verified");
  });

  it("returns 404 with generic message for non-EtherscanError", async () => {
    (fetchContractAbi as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network timeout")
    );
    const res = await GET(makeRequest(), makeParams("ethereum", VALID_ADDRESS));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch contract data");
  });

  it("works with chain arbitrum (chainId 42161)", async () => {
    await GET(makeRequest(), makeParams("arbitrum", VALID_ADDRESS));
    expect(fetchContractAbi).toHaveBeenCalledWith(
      42161,
      VALID_ADDRESS,
      "test-api-key-12345"
    );
  });

  it("works with chain optimism (chainId 10)", async () => {
    await GET(makeRequest(), makeParams("optimism", VALID_ADDRESS));
    expect(fetchContractAbi).toHaveBeenCalledWith(
      10,
      VALID_ADDRESS,
      "test-api-key-12345"
    );
  });

  it("works with chain base (chainId 8453)", async () => {
    await GET(makeRequest(), makeParams("base", VALID_ADDRESS));
    expect(fetchContractAbi).toHaveBeenCalledWith(
      8453,
      VALID_ADDRESS,
      "test-api-key-12345"
    );
  });
});
