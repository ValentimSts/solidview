"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ChainSlug } from "@/types/contract";

export type ValidationState = "empty" | "idle" | "validating" | "valid" | "invalid";

interface ApiKeyState {
  primaryKey: string;
  chainOverrides: Partial<Record<ChainSlug, string>>;
  validationStates: Record<string, ValidationState>;
  validationErrors: Record<string, string>;
  serverKeyAvailable: boolean;
  serverChainKeys: Partial<Record<ChainSlug, boolean>>;
}

interface ApiKeyContextValue extends ApiKeyState {
  setPrimaryKey: (key: string) => void;
  setChainOverride: (chain: ChainSlug, key: string) => void;
  getKeyForChain: (chain: ChainSlug) => string | undefined;
  hasKeyForChain: (chain: ChainSlug) => boolean;
  setValidation: (fieldKey: string, state: ValidationState, error?: string) => void;
  getValidation: (fieldKey: string) => { state: ValidationState; error: string };
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

interface ApiKeyProviderProps {
  children: React.ReactNode;
  initialPrimaryKey?: string;
  initialChainOverrides?: Partial<Record<ChainSlug, string>>;
  serverKeyAvailable?: boolean;
  serverChainKeys?: Partial<Record<ChainSlug, boolean>>;
}

export function ApiKeyProvider({
  children,
  initialPrimaryKey,
  initialChainOverrides,
  serverKeyAvailable = false,
  serverChainKeys: initialServerChainKeys,
}: ApiKeyProviderProps) {
  const [state, setState] = useState<ApiKeyState>({
    primaryKey: initialPrimaryKey ?? "",
    chainOverrides: initialChainOverrides ?? {},
    validationStates: {},
    validationErrors: {},
    serverKeyAvailable,
    serverChainKeys: initialServerChainKeys ?? {},
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
    [state.chainOverrides, state.primaryKey]
  );

  const hasKeyForChain = useCallback(
    (chain: ChainSlug) => {
      if (state.chainOverrides[chain] || state.primaryKey) return true;
      if (state.serverChainKeys[chain] || state.serverKeyAvailable) return true;
      return false;
    },
    [state.chainOverrides, state.primaryKey, state.serverKeyAvailable, state.serverChainKeys]
  );

  const setValidation = useCallback((fieldKey: string, validationState: ValidationState, error?: string) => {
    setState((prev) => ({
      ...prev,
      validationStates: { ...prev.validationStates, [fieldKey]: validationState },
      validationErrors: {
        ...prev.validationErrors,
        [fieldKey]: error ?? "",
      },
    }));
  }, []);

  const getValidation = useCallback(
    (fieldKey: string) => ({
      state: state.validationStates[fieldKey] ?? "empty",
      error: state.validationErrors[fieldKey] ?? "",
    }),
    [state.validationStates, state.validationErrors]
  );

  const value = useMemo(
    () => ({
      ...state,
      setPrimaryKey,
      setChainOverride,
      getKeyForChain,
      hasKeyForChain,
      setValidation,
      getValidation,
    }),
    [state, setPrimaryKey, setChainOverride, getKeyForChain, hasKeyForChain, setValidation, getValidation]
  );

  return (
    <ApiKeyContext.Provider value={value}>
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
