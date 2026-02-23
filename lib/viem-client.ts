import { createPublicClient, fallback, http, type PublicClient } from "viem";
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

const clientCache = new Map<ChainSlug, PublicClient>();

export function getPublicClient(slug: ChainSlug): PublicClient {
  const cached = clientCache.get(slug);
  if (cached) return cached;

  const chainConfig = getChainConfig(slug);
  const viemChain = viemChains[slug as keyof typeof viemChains];

  if (!viemChain) {
    throw new Error(`No viem chain for: ${slug}`);
  }

  const envRpcUrl = process.env[`RPC_URL_${slug.toUpperCase()}`];
  const transport = envRpcUrl
    ? fallback([http(envRpcUrl), http(chainConfig.rpcUrl)])
    : http(chainConfig.rpcUrl);

  const client = createPublicClient({
    chain: viemChain,
    transport,
  });

  clientCache.set(slug, client as PublicClient);
  return client as PublicClient;
}
