"use client";

import { getAllChains } from "@/lib/chains";
import type { ChainSlug } from "@/types/contract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChainSelectorProps {
  value: ChainSlug;
  onChange: (chain: ChainSlug) => void;
  chainStatus?: Record<string, boolean>;
}

const chains = getAllChains();

export function ChainSelector({
  value,
  onChange,
  chainStatus,
}: ChainSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ChainSlug)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {chains.map((chain) => (
          <SelectItem key={chain.slug} value={chain.slug}>
            <span className="flex items-center gap-2">
              {chainStatus && (
                <span
                  className={`size-2 rounded-full ${
                    chainStatus[chain.slug] ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              )}
              {chain.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
