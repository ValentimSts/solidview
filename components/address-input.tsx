"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChainSelector } from "@/components/chain-selector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAllChains } from "@/lib/chains";
import type { ChainSlug } from "@/types/contract";

const chainsBySlug = Object.fromEntries(
  getAllChains().map((c) => [c.slug, c])
);

export function AddressInput() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<ChainSlug>("ethereum");
  const [error, setError] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<Record<string, boolean>>({});
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    fetch("/api/chains/status")
      .then((res) => res.json())
      .then((data) => setChainStatus(data))
      .catch(() => {});
  }, []);

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

    if (chainStatus[chain] === false) {
      setShowOfflineAlert(true);
      return;
    }

    router.push(`/${chain}/${trimmed}`);
  }

  const selectedChainName = chainsBySlug[chain]?.name ?? chain;

  return (
    <>
      <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-3">
        <div className="flex gap-2">
          <ChainSelector
            value={chain}
            onChange={setChain}
            chainStatus={chainStatus}
          />
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

      <AlertDialog open={showOfflineAlert} onOpenChange={setShowOfflineAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chain Unavailable</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedChainName} is currently unavailable. An API key is
              required to explore contracts on this chain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowOfflineAlert(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
