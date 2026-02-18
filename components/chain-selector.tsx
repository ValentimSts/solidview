"use client";

import { getAllChains } from "@/lib/chains";
import type { ChainSlug } from "@/types/contract";

interface ChainSelectorProps {
  value: ChainSlug;
  onChange: (chain: ChainSlug) => void;
}

const chains = getAllChains();

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ChainSlug)}
      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {chains.map((chain) => (
        <option key={chain.slug} value={chain.slug}>
          {chain.name}
        </option>
      ))}
    </select>
  );
}
