import type { ChainSlug, ChainConfig } from "@/types/contract";

const chains: Record<ChainSlug, ChainConfig> = {
  ethereum: {
    slug: "ethereum",
    name: "Ethereum",
    chainId: 1,
    explorerUrl: "https://etherscan.io",
    rpcUrl: "https://eth.llamarpc.com",
  },
  arbitrum: {
    slug: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    explorerUrl: "https://arbiscan.io",
    rpcUrl: "https://arbitrum.llamarpc.com",
  },
  optimism: {
    slug: "optimism",
    name: "Optimism",
    chainId: 10,
    explorerUrl: "https://optimistic.etherscan.io",
    rpcUrl: "https://optimism.llamarpc.com",
  },
  base: {
    slug: "base",
    name: "Base",
    chainId: 8453,
    explorerUrl: "https://basescan.org",
    rpcUrl: "https://base.llamarpc.com",
  },
  polygon: {
    slug: "polygon",
    name: "Polygon",
    chainId: 137,
    explorerUrl: "https://polygonscan.com",
    rpcUrl: "https://polygon.llamarpc.com",
  },
};

/**
 * Returns the configuration for a supported chain.
 * @param slug - The chain identifier (e.g. "ethereum", "arbitrum").
 * @returns The full chain configuration including RPC and explorer URLs.
 * @throws If the slug does not match any supported chain.
 */
export function getChainConfig(slug: ChainSlug): ChainConfig {
  const config = chains[slug];
  if (!config) {
    throw new Error(`Unknown chain: ${slug}`);
  }
  return config;
}

/**
 * Returns configurations for all supported chains.
 * @returns An array of every registered {@link ChainConfig}.
 */
export function getAllChains(): ChainConfig[] {
  return Object.values(chains);
}

/**
 * Type guard that checks whether a string is a supported {@link ChainSlug}.
 * @param value - The string to validate.
 * @returns `true` if the value is a known chain slug, narrowing its type.
 */
export function isValidChainSlug(value: string): value is ChainSlug {
  return value in chains;
}
