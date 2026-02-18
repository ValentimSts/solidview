import { createPublicClient, http } from "viem";
import { mainnet, arbitrum, optimism, base, polygon } from "viem/chains";
import type { ChainSlug } from "@/types/contract";
import { getChainConfig } from "@/lib/chains";

const viemChains = {
  ethereum: mainnet,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
  polygon: polygon,
} as const;

type ViemClient = ReturnType<typeof createPublicClient>;

const clientCache = new Map<ChainSlug, ViemClient>();

export function getPublicClient(slug: ChainSlug): ViemClient {
  const cached = clientCache.get(slug);
  if (cached) return cached;

  const chainConfig = getChainConfig(slug);
  const viemChain = viemChains[slug as keyof typeof viemChains];

  if (!viemChain) {
    throw new Error(`No viem chain for: ${slug}`);
  }

  const client = createPublicClient({
    chain: viemChain,
    transport: http(chainConfig.rpcUrl),
  });

  clientCache.set(slug, client);
  return client;
}
