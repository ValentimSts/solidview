import { describe, it, expect } from "vitest";
import { getPublicClient } from "@/lib/viem-client";

describe("viem-client", () => {
  it("creates a public client for ethereum", () => {
    const client = getPublicClient("ethereum");
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(1);
  });

  it("creates a public client for arbitrum", () => {
    const client = getPublicClient("arbitrum");
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(42161);
  });

  it("creates a public client for all supported chains", () => {
    const slugs = [
      "ethereum",
      "arbitrum",
      "optimism",
      "base",
      "polygon",
    ] as const;
    for (const slug of slugs) {
      const client = getPublicClient(slug);
      expect(client).toBeDefined();
    }
  });

  it("throws for invalid chain", () => {
    expect(() => getPublicClient("solana" as any)).toThrow();
  });
});
