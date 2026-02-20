import type { ChainSlug } from "@/types/contract";

export interface RecentSearch {
  address: string;
  chain: ChainSlug;
  timestamp: number;
}

const STORAGE_KEY = "solidview:recent-searches";
const MAX_ENTRIES = 5;

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

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
