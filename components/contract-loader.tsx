"use client";

import { useEffect, useReducer } from "react";
import { useApiKeys } from "@/lib/api-key-context";
import { ContractHeader } from "@/components/contract-header";
import { ContractTabs } from "@/components/contract/contract-tabs";
import { Separator } from "@/components/ui/separator";
import { parseContractAbi } from "@/lib/abi-utils";
import type { ChainSlug, ContractMetadata, ContractSource } from "@/types/contract";
import type { Abi, AbiFunction, AbiEvent } from "viem";

interface ContractData {
  abi: Abi;
  metadata: ContractMetadata;
  source: ContractSource;
  readFunctions: AbiFunction[];
  writeFunctions: AbiFunction[];
  events: AbiEvent[];
}

type State =
  | { status: "loading"; error: null; data: null }
  | { status: "error"; error: string; data: null }
  | { status: "success"; error: null; data: ContractData };

type Action =
  | { type: "fetch" }
  | { type: "error"; error: string }
  | { type: "success"; data: ContractData };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "fetch":
      return { status: "loading", error: null, data: null };
    case "error":
      return { status: "error", error: action.error, data: null };
    case "success":
      return { status: "success", error: null, data: action.data };
  }
}

const initialState: State = { status: "loading", error: null, data: null };

interface ContractLoaderProps {
  chain: ChainSlug;
  address: string;
}

export function ContractLoader({ chain, address }: ContractLoaderProps) {
  const { getKeyForChain, hasKeyForChain } = useApiKeys();
  const key = getKeyForChain(chain);
  const hasKey = hasKeyForChain(chain);
  const noKeyAvailable = !key && !hasKey;

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (noKeyAvailable) return;

    dispatch({ type: "fetch" });

    const headers: Record<string, string> = {};
    if (key) headers["x-api-key"] = key;

    const controller = new AbortController();

    fetch(`/api/contract/${chain}/${address}`, {
      headers,
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch contract data");
        return res.json();
      })
      .then((json) => {
        if (json.error) {
          dispatch({ type: "error", error: json.error });
        } else {
          const abi = json.abi as Abi;
          const { readFunctions, writeFunctions, events } =
            parseContractAbi(abi);
          dispatch({
            type: "success",
            data: {
              abi,
              metadata: json.metadata,
              source: json.source,
              readFunctions,
              writeFunctions,
              events,
            },
          });
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        dispatch({ type: "error", error: "Failed to fetch contract data" });
      });

    return () => controller.abort();
  }, [chain, address, key, hasKey, noKeyAvailable]);

  if (noKeyAvailable) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No API key configured. Add one via the key icon in the header.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="mt-2 text-sm text-muted-foreground">{state.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <ContractHeader
        address={address}
        chain={chain}
        metadata={state.data.metadata}
        readCount={state.data.readFunctions.length}
        writeCount={state.data.writeFunctions.length}
        eventCount={state.data.events.length}
      />
      <Separator className="my-6" />
      <ContractTabs
        chain={chain}
        address={address}
        readFunctions={state.data.readFunctions}
        events={state.data.events}
        source={state.data.source}
      />
    </div>
  );
}
