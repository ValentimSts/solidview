import type { ChainSlug } from "@/types/contract";

/** A previously searched contract address with its chain and lookup time. */
export interface RecentSearch {
  address: string;
  chain: ChainSlug;
  timestamp: number;
}

const STORAGE_KEY = "solidview:recent-searches";
const MAX_ENTRIES = 5;

/**
 * Reads the recent search history from localStorage.
 * Returns an empty array on the server or if parsing fails.
 * @returns Up to {@link MAX_ENTRIES} recent searches, newest first.
 */
export function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Adds a contract lookup to the recent search history in localStorage.
 * Deduplicates by address+chain and caps the list at {@link MAX_ENTRIES}.
 * @param address - The contract address that was searched.
 * @param chain - The chain the contract belongs to.
 */
export function addRecentSearch(address: string, chain: ChainSlug): void {
  const searches = getRecentSearches().filter(
    (s) =>
      !(s.address.toLowerCase() === address.toLowerCase() && s.chain === chain)
  );
  searches.unshift({ address, chain, timestamp: Date.now() });
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(searches.slice(0, MAX_ENTRIES))
  );
}
