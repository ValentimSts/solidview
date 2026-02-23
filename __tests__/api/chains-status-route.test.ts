import { describe, it, expect, afterEach, vi } from "vitest";
import { GET } from "@/app/api/chains/status/route";
import type { ChainSlug } from "@/types/contract";

const ALL_CHAIN_SLUGS: ChainSlug[] = [
  "ethereum",
  "arbitrum",
  "optimism",
  "base",
  "polygon",
];

describe("GET /api/chains/status", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns all chains as true when ETHERSCAN_API_KEY is set", async () => {
    vi.stubEnv("ETHERSCAN_API_KEY", "test-key-123");

    const response = await GET();
    const body = await response.json();

    for (const slug of ALL_CHAIN_SLUGS) {
      expect(body[slug]).toBe(true);
    }
  });

  it("returns all chains as false when ETHERSCAN_API_KEY is not set", async () => {
    vi.unstubAllEnvs();
    delete process.env.ETHERSCAN_API_KEY;

    const response = await GET();
    const body = await response.json();

    for (const slug of ALL_CHAIN_SLUGS) {
      expect(body[slug]).toBe(false);
    }
  });

  it("response contains all 5 chain slugs as keys", async () => {
    vi.stubEnv("ETHERSCAN_API_KEY", "test-key");

    const response = await GET();
    const body = await response.json();
    const keys = Object.keys(body);

    expect(keys).toHaveLength(5);
    for (const slug of ALL_CHAIN_SLUGS) {
      expect(keys).toContain(slug);
    }
  });

  it("returns 200 status", async () => {
    vi.stubEnv("ETHERSCAN_API_KEY", "test-key");

    const response = await GET();

    expect(response.status).toBe(200);
  });
});
