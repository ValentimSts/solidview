"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getRecentSearches, type RecentSearch } from "@/lib/recent-searches";
import { Badge } from "@/components/ui/badge";

let _cached: RecentSearch[] = [];

function subscribeSearches(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSearchesSnapshot(): RecentSearch[] {
  const fresh = getRecentSearches();
  if (
    fresh.length === _cached.length &&
    fresh.every(
      (s, i) => s.address === _cached[i].address && s.chain === _cached[i].chain
    )
  ) {
    return _cached;
  }
  _cached = fresh;
  return _cached;
}

const EMPTY_SEARCHES: RecentSearch[] = [];

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
}

export function RecentSearches() {
  const searches = useSyncExternalStore(
    subscribeSearches,
    getSearchesSnapshot,
    () => EMPTY_SEARCHES,
  );

  if (searches.length === 0) return null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">
        Recently searched
      </p>
      <div className="flex flex-wrap gap-2">
        {searches.map((s) => (
          <Link
            key={`${s.chain}-${s.address}`}
            href={`/${s.chain}/${s.address}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors hover:bg-accent"
          >
            <span className="font-mono text-xs">
              {truncateAddress(s.address)}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {s.chain}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
