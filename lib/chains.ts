import type { ChainSlug, ChainConfig } from "@/types/contract";

const chains: Record<ChainSlug, ChainConfig> = {
  ethereum: {
    slug: "ethereum",
    name: "Ethereum",
    chainId: 1,
    explorerApiUrl: "https://api.etherscan.io/api",
    explorerApiKeyEnv: "ETHERSCAN_API_KEY",
    explorerUrl: "https://etherscan.io",
    rpcUrl: "https://eth.llamarpc.com",
  },
  arbitrum: {
    slug: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    explorerApiUrl: "https://api.arbiscan.io/api",
    explorerApiKeyEnv: "ARBISCAN_API_KEY",
    explorerUrl: "https://arbiscan.io",
    rpcUrl: "https://arbitrum.llamarpc.com",
  },
  optimism: {
    slug: "optimism",
    name: "Optimism",
    chainId: 10,
    explorerApiUrl: "https://api-optimistic.etherscan.io/api",
    explorerApiKeyEnv: "OPTIMISM_ETHERSCAN_API_KEY",
    explorerUrl: "https://optimistic.etherscan.io",
    rpcUrl: "https://optimism.llamarpc.com",
  },
  base: {
    slug: "base",
    name: "Base",
    chainId: 8453,
    explorerApiUrl: "https://api.basescan.org/api",
    explorerApiKeyEnv: "BASESCAN_API_KEY",
    explorerUrl: "https://basescan.org",
    rpcUrl: "https://base.llamarpc.com",
  },
  polygon: {
    slug: "polygon",
    name: "Polygon",
    chainId: 137,
    explorerApiUrl: "https://api.polygonscan.com/api",
    explorerApiKeyEnv: "POLYGONSCAN_API_KEY",
    explorerUrl: "https://polygonscan.com",
    rpcUrl: "https://polygon.llamarpc.com",
  },
};

export function getChainConfig(slug: ChainSlug): ChainConfig {
  const config = chains[slug];
  if (!config) {
    throw new Error(`Unknown chain: ${slug}`);
  }
  return config;
}

export function getAllChains(): ChainConfig[] {
  return Object.values(chains);
}

export function isValidChainSlug(value: string): value is ChainSlug {
  return value in chains;
}
