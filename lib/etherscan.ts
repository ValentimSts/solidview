import type { Abi } from "viem";
import type { ContractMetadata, ContractSource } from "@/types/contract";

const ETHERSCAN_V2_URL = "https://api.etherscan.io/v2/api";

// In-memory LRU cache for Etherscan responses (ABI + source are immutable once verified)
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCacheKey(chainId: number, address: string, action: string): string {
  return `${chainId}:${address.toLowerCase()}:${action}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInCache<T>(key: string, data: T): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

/** Clear all cached entries. Exported for testing. */
export function clearEtherscanCache(): void {
  cache.clear();
}

export class EtherscanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EtherscanError";
  }
}

function getApiKey(): string {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) {
    throw new EtherscanError("ETHERSCAN_API_KEY is not configured");
  }
  return key;
}

export async function fetchContractAbi(
  chainId: number,
  address: string,
  apiKey?: string
): Promise<Abi> {
  const cacheKey = getCacheKey(chainId, address, "getabi");
  const cached = getFromCache<Abi>(cacheKey);
  if (cached) return cached;

  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getabi");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey ?? getApiKey());

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new EtherscanError(`Etherscan API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "1") {
    throw new EtherscanError(data.result || "Failed to fetch ABI");
  }

  const abi = JSON.parse(data.result) as Abi;
  setInCache(cacheKey, abi);
  return abi;
}

export async function fetchContractSource(
  chainId: number,
  address: string,
  apiKey?: string
): Promise<{ metadata: ContractMetadata; source: ContractSource }> {
  const cacheKey = getCacheKey(chainId, address, "getsourcecode");
  const cached = getFromCache<{ metadata: ContractMetadata; source: ContractSource }>(cacheKey);
  if (cached) return cached;

  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey ?? getApiKey());

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new EtherscanError(`Etherscan API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "1" || !data.result?.[0]) {
    throw new EtherscanError(data.result || "Failed to fetch source code");
  }

  const result = data.result[0];

  const metadata: ContractMetadata = {
    name: result.ContractName,
    compilerVersion: result.CompilerVersion,
    optimizationUsed: result.OptimizationUsed === "1",
    runs: parseInt(result.Runs, 10),
    license: result.LicenseType || "Unknown",
    evmVersion: result.EVMVersion || "default",
  };

  const source = parseSourceCode(result.SourceCode, result.ContractName);

  const entry = { metadata, source };
  setInCache(cacheKey, entry);
  return entry;
}

function parseSourceCode(
  rawSource: string,
  contractName: string
): ContractSource {
  if (rawSource.startsWith("{{")) {
    const jsonStr = rawSource.slice(1, -1);
    try {
      const parsed = JSON.parse(jsonStr);
      const files: Record<string, string> = {};

      if (parsed.sources) {
        for (const [path, data] of Object.entries(parsed.sources)) {
          files[path] = (data as { content: string }).content;
        }
      }

      return { files, language: "Solidity" };
    } catch {
      // Fall through to single-file format
    }
  }

  return {
    files: { [`${contractName}.sol`]: rawSource },
    language: "Solidity",
  };
}
