"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChainSelector } from "@/components/chain-selector";
import type { ChainSlug } from "@/types/contract";

export function AddressInput() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<ChainSlug>("ethereum");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = address.trim();

    if (!trimmed) {
      setError("Please enter a contract address");
      return;
    }

    if (!isAddress(trimmed)) {
      setError("Invalid Ethereum address");
      return;
    }

    router.push(`/${chain}/${trimmed}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex gap-2">
        <ChainSelector value={chain} onChange={setChain} />
        <Input
          type="text"
          placeholder="0x..."
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError(null);
          }}
          className="flex-1 font-mono"
        />
        <Button type="submit">Explore</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
