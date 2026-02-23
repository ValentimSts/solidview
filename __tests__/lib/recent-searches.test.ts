// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getRecentSearches,
  addRecentSearch,
  type RecentSearch,
} from "@/lib/recent-searches";
import type { ChainSlug } from "@/types/contract";

const STORAGE_KEY = "solidview:recent-searches";

describe("recent-searches", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns empty array when storage has no entry for the key", () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it("returns empty array in SSR environment (no window)", () => {
    vi.stubGlobal("window", undefined);
    expect(getRecentSearches()).toEqual([]);
  });

  it("parses and returns stored searches", () => {
    const searches: RecentSearch[] = [
      { address: "0xaaa", chain: "ethereum", timestamp: 1000 },
      { address: "0xbbb", chain: "polygon", timestamp: 2000 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));

    const result = getRecentSearches();
    expect(result).toEqual(searches);
  });

  it("returns empty array when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage error");
    });

    expect(getRecentSearches()).toEqual([]);
  });

  it("addRecentSearch adds new entry to front of list", () => {
    const existing: RecentSearch[] = [
      { address: "0xaaa", chain: "ethereum", timestamp: 1000 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    addRecentSearch("0xbbb", "polygon");

    const result = getRecentSearches();
    expect(result).toHaveLength(2);
    expect(result[0].address).toBe("0xbbb");
    expect(result[0].chain).toBe("polygon");
    expect(result[1].address).toBe("0xaaa");
  });

  it("deduplicates case-insensitively by address and chain", () => {
    const existing: RecentSearch[] = [
      { address: "0xabc", chain: "ethereum", timestamp: 1000 },
      { address: "0xdef", chain: "polygon", timestamp: 900 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    addRecentSearch("0xABC", "ethereum");

    const result = getRecentSearches();
    expect(result).toHaveLength(2);
    expect(result[0].address).toBe("0xABC");
    expect(result[0].chain).toBe("ethereum");
    expect(result[1].address).toBe("0xdef");
  });

  it("caps entries at a maximum of 5", () => {
    const chains: ChainSlug[] = [
      "ethereum",
      "arbitrum",
      "optimism",
      "base",
      "polygon",
    ];
    for (let i = 0; i < 5; i++) {
      addRecentSearch(`0x${String(i).padStart(40, "0")}`, chains[i]);
    }
    expect(getRecentSearches()).toHaveLength(5);

    addRecentSearch("0xnew", "ethereum");

    const result = getRecentSearches();
    expect(result).toHaveLength(5);
    expect(result[0].address).toBe("0xnew");
  });

  it("preserves existing entries of different address/chain combos", () => {
    addRecentSearch("0xaaa", "ethereum");
    addRecentSearch("0xbbb", "polygon");
    addRecentSearch("0xccc", "arbitrum");

    const result = getRecentSearches();
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.address)).toEqual([
      "0xccc",
      "0xbbb",
      "0xaaa",
    ]);
    expect(result.map((s) => s.chain)).toEqual([
      "arbitrum",
      "polygon",
      "ethereum",
    ]);
  });
});
