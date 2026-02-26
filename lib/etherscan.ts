import { unstable_cache } from "next/cache";
import type { Abi } from "viem";
import type { ContractMetadata, ContractSource } from "@/types/contract";

const ETHERSCAN_V2_URL = "https://api.etherscan.io/v2/api";

// ---------------------------------------------------------------------------
// In-memory LRU cache (L1) — fast, process-local, evicts after 24 h or 500
// entries. Sits in front of the persistent Next.js Data Cache (L2).
// ---------------------------------------------------------------------------

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

/**
 * Clear the in-memory (L1) cache layer.
 *
 * This does **not** invalidate the persistent Next.js Data Cache (L2) managed
 * by `unstable_cache`. Use `revalidateTag` from `next/cache` to bust the L2
 * cache for a specific entry if needed.
 *
 * Exported primarily for testing.
 */
export function clearEtherscanCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Error thrown when an Etherscan API request fails.
 *
 * Covers HTTP-level failures (non-2xx status), Etherscan-level error
 * responses (`status !== "1"`), and missing configuration (no API key).
 */
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

// ---------------------------------------------------------------------------
// Internal fetch helpers (no in-memory caching, no AbortSignal)
// ---------------------------------------------------------------------------

/**
 * Raw ABI fetcher used as the callback for `unstable_cache`.
 *
 * Does **not** use `AbortSignal.timeout` because `unstable_cache` may invoke
 * the callback during ISR / build time where abort signals are not supported.
 */
async function fetchAbiRaw(
  chainId: number,
  address: string,
  apiKey?: string,
): Promise<Abi> {
  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getabi");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey ?? getApiKey());

  const response = await fetch(url);

  if (!response.ok) {
    throw new EtherscanError(`Etherscan API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "1") {
    const message =
      typeof data.result === "string" ? data.result : "Failed to fetch ABI";
    throw new EtherscanError(message);
  }

  return JSON.parse(data.result) as Abi;
}

/**
 * Raw source-code fetcher used as the callback for `unstable_cache`.
 *
 * Does **not** use `AbortSignal.timeout` because `unstable_cache` may invoke
 * the callback during ISR / build time where abort signals are not supported.
 */
async function fetchSourceRaw(
  chainId: number,
  address: string,
  apiKey?: string,
): Promise<{ metadata: ContractMetadata; source: ContractSource }> {
  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey ?? getApiKey());

  const response = await fetch(url);

  if (!response.ok) {
    throw new EtherscanError(`Etherscan API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "1" || !data.result?.[0]) {
    const message =
      typeof data.result === "string"
        ? data.result
        : "Failed to fetch source code";
    throw new EtherscanError(message);
  }

  const result = data.result[0];

  const metadata: ContractMetadata = {
    name: result.ContractName,
    compilerVersion: result.CompilerVersion,
    optimizationUsed: result.OptimizationUsed === "1",
    runs: parseInt(result.Runs, 10) || 0,
    license: result.LicenseType || "Unknown",
    evmVersion: result.EVMVersion || "default",
  };

  const source = parseSourceCode(result.SourceCode, result.ContractName, result.CompilerVersion);

  return { metadata, source };
}

// ---------------------------------------------------------------------------
// Persistent cache wrappers (L2) — Next.js Data Cache via `unstable_cache`
// ---------------------------------------------------------------------------

/** 24 hours, matching the in-memory TTL. */
const REVALIDATE_SECONDS = 86_400;

/**
 * Create a persistent-cache-wrapped version of the ABI fetcher.
 *
 * The cache key includes `chainId` and normalised `address` so that the same
 * contract never triggers duplicate Etherscan requests across server restarts
 * or ISR re-renders.
 */
function getCachedAbiFetcher(chainId: number, address: string) {
  const normalisedAddress = address.toLowerCase();
  return unstable_cache(
    async () => fetchAbiRaw(chainId, normalisedAddress),
    ["etherscan-abi", String(chainId), normalisedAddress],
    { revalidate: REVALIDATE_SECONDS },
  );
}

/**
 * Create a persistent-cache-wrapped version of the source-code fetcher.
 *
 * See `getCachedAbiFetcher` for cache key semantics.
 */
function getCachedSourceFetcher(chainId: number, address: string) {
  const normalisedAddress = address.toLowerCase();
  return unstable_cache(
    async () => fetchSourceRaw(chainId, normalisedAddress),
    ["etherscan-source", String(chainId), normalisedAddress],
    { revalidate: REVALIDATE_SECONDS },
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the ABI for a verified contract from Etherscan.
 *
 * Resolution order:
 * 1. **L1 -- in-memory LRU cache** (per-process, 24 h TTL, max 500 entries).
 * 2. **L2 -- Next.js Data Cache** (persistent across deploys, 24 h revalidate
 *    via `unstable_cache`).
 * 3. **Etherscan V2 API** (network call).
 *
 * When a custom `apiKey` is supplied (e.g. from the client-side API key panel)
 * the persistent L2 cache is bypassed so that the user's own rate-limit
 * allocation is used and the response is not shared with other users.
 *
 * @param chainId  - Numeric EVM chain ID (e.g. 1 for Ethereum mainnet).
 * @param address  - Checksummed or lowercase contract address.
 * @param apiKey   - Optional user-provided Etherscan API key.
 * @returns The parsed ABI array.
 * @throws {EtherscanError} On HTTP errors, Etherscan error responses, or
 *   missing API key configuration.
 */
export async function fetchContractAbi(
  chainId: number,
  address: string,
  apiKey?: string,
): Promise<Abi> {
  // L1: in-memory cache
  const cacheKey = getCacheKey(chainId, address, "getabi");
  const cached = getFromCache<Abi>(cacheKey);
  if (cached) return cached;

  let abi: Abi;

  if (apiKey) {
    // Custom API key -- skip L2, fetch directly with timeout
    abi = await fetchAbiRaw(chainId, address, apiKey);
  } else {
    // L2: persistent Next.js Data Cache, falling back to direct fetch if
    // the incremental cache runtime is unavailable (e.g. unit tests).
    try {
      abi = await getCachedAbiFetcher(chainId, address)();
    } catch (error: unknown) {
      // If the error is from unstable_cache infrastructure (not Etherscan),
      // fall through to a direct fetch.
      if (error instanceof EtherscanError) throw error;
      abi = await fetchAbiRaw(chainId, address);
    }
  }

  setInCache(cacheKey, abi);
  return abi;
}

/**
 * Fetch the source code and compiler metadata for a verified contract from
 * Etherscan.
 *
 * Resolution order:
 * 1. **L1 -- in-memory LRU cache** (per-process, 24 h TTL, max 500 entries).
 * 2. **L2 -- Next.js Data Cache** (persistent across deploys, 24 h revalidate
 *    via `unstable_cache`).
 * 3. **Etherscan V2 API** (network call).
 *
 * When a custom `apiKey` is supplied the persistent L2 cache is bypassed (see
 * {@link fetchContractAbi} for rationale).
 *
 * @param chainId  - Numeric EVM chain ID.
 * @param address  - Checksummed or lowercase contract address.
 * @param apiKey   - Optional user-provided Etherscan API key.
 * @returns An object containing `metadata` and `source`.
 * @throws {EtherscanError} On HTTP errors, Etherscan error responses, or
 *   missing API key configuration.
 */
export async function fetchContractSource(
  chainId: number,
  address: string,
  apiKey?: string,
): Promise<{ metadata: ContractMetadata; source: ContractSource }> {
  // L1: in-memory cache
  const cacheKey = getCacheKey(chainId, address, "getsourcecode");
  const cached = getFromCache<{ metadata: ContractMetadata; source: ContractSource }>(cacheKey);
  if (cached) return cached;

  let entry: { metadata: ContractMetadata; source: ContractSource };

  if (apiKey) {
    // Custom API key -- skip L2, fetch directly
    entry = await fetchSourceRaw(chainId, address, apiKey);
  } else {
    // L2: persistent Next.js Data Cache with fallback
    try {
      entry = await getCachedSourceFetcher(chainId, address)();
    } catch (error: unknown) {
      if (error instanceof EtherscanError) throw error;
      entry = await fetchSourceRaw(chainId, address);
    }
  }

  setInCache(cacheKey, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// Source code parser
// ---------------------------------------------------------------------------

function detectLanguage(compilerVersion: string): "Solidity" | "Vyper" {
  return compilerVersion.toLowerCase().startsWith("vyper") ? "Vyper" : "Solidity";
}

function parseSourceCode(
  rawSource: string,
  contractName: string,
  compilerVersion: string,
): ContractSource {
  const language = detectLanguage(compilerVersion);

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

      return { files, language };
    } catch {
      // Fall through to single-file format
    }
  }

  const ext = language === "Vyper" ? ".vy" : ".sol";
  return {
    files: { [`${contractName}${ext}`]: rawSource },
    language,
  };
}
