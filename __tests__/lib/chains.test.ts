import { describe, it, expect } from "vitest";
import { getChainConfig, getAllChains, isValidChainSlug } from "@/lib/chains";

describe("chains", () => {
  it("returns config for ethereum", () => {
    const config = getChainConfig("ethereum");
    expect(config).toBeDefined();
    expect(config.chainId).toBe(1);
    expect(config.slug).toBe("ethereum");
  });

  it("returns config for all supported chains", () => {
    const slugs = [
      "ethereum",
      "arbitrum",
      "optimism",
      "base",
      "polygon",
    ] as const;
    for (const slug of slugs) {
      const config = getChainConfig(slug);
      expect(config).toBeDefined();
      expect(config.slug).toBe(slug);
    }
  });

  it("throws for unknown chain", () => {
    expect(() => getChainConfig("solana" as any)).toThrow();
  });

  it("getAllChains returns all 5 chains", () => {
    const chains = getAllChains();
    expect(chains).toHaveLength(5);
  });

  it("validates chain slugs", () => {
    expect(isValidChainSlug("ethereum")).toBe(true);
    expect(isValidChainSlug("arbitrum")).toBe(true);
    expect(isValidChainSlug("solana")).toBe(false);
    expect(isValidChainSlug("")).toBe(false);
  });
});
