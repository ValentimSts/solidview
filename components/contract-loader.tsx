"use client";

import { useEffect, useState } from "react";
import { useApiKeys } from "@/lib/api-key-context";
import { ContractHeader } from "@/components/contract-header";
import { ContractTabs } from "@/components/contract/contract-tabs";
import { Separator } from "@/components/ui/separator";
import { parseContractAbi } from "@/lib/abi-utils";
import type { ChainSlug, ContractMetadata, ContractSource } from "@/types/contract";
import type { Abi, AbiFunction, AbiEvent } from "viem";

interface ContractLoaderProps {
  chain: ChainSlug;
  address: string;
}

export function ContractLoader({ chain, address }: ContractLoaderProps) {
  const { getKeyForChain } = useApiKeys();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    abi: Abi;
    metadata: ContractMetadata;
    source: ContractSource;
    readFunctions: AbiFunction[];
    writeFunctions: AbiFunction[];
    events: AbiEvent[];
  } | null>(null);

  useEffect(() => {
    const key = getKeyForChain(chain);
    if (!key) {
      setError("No API key configured. Add one via the key icon in the header.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/contract/${chain}/${address}`, {
      headers: { "x-api-key": key },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          const abi = json.abi as Abi;
          const { readFunctions, writeFunctions, events } =
            parseContractAbi(abi);
          setData({
            abi,
            metadata: json.metadata,
            source: json.source,
            readFunctions,
            writeFunctions,
            events,
          });
        }
      })
      .catch(() => setError("Failed to fetch contract data"))
      .finally(() => setLoading(false));
  }, [chain, address, getKeyForChain]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <ContractHeader
        address={address}
        chain={chain}
        metadata={data.metadata}
        readCount={data.readFunctions.length}
        writeCount={data.writeFunctions.length}
        eventCount={data.events.length}
      />
      <Separator className="my-6" />
      <ContractTabs
        chain={chain}
        address={address}
        readFunctions={data.readFunctions}
        events={data.events}
        source={data.source}
      />
    </div>
  );
}
