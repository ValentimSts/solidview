"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ChainSlug } from "@/types/contract";

interface ApiKeyState {
  primaryKey: string;
  chainOverrides: Partial<Record<ChainSlug, string>>;
}

interface ApiKeyContextValue extends ApiKeyState {
  setPrimaryKey: (key: string) => void;
  setChainOverride: (chain: ChainSlug, key: string) => void;
  getKeyForChain: (chain: ChainSlug) => string | undefined;
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ApiKeyState>({
    primaryKey: "",
    chainOverrides: {},
  });

  const setPrimaryKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, primaryKey: key }));
  }, []);

  const setChainOverride = useCallback((chain: ChainSlug, key: string) => {
    setState((prev) => ({
      ...prev,
      chainOverrides: { ...prev.chainOverrides, [chain]: key },
    }));
  }, []);

  const getKeyForChain = useCallback(
    (chain: ChainSlug) => {
      return state.chainOverrides[chain] || state.primaryKey || undefined;
    },
    [state]
  );

  return (
    <ApiKeyContext.Provider
      value={{ ...state, setPrimaryKey, setChainOverride, getKeyForChain }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error("useApiKeys must be used within an ApiKeyProvider");
  }
  return context;
}
