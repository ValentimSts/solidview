"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ChainSlug } from "@/types/contract";

export type ValidationState = "empty" | "idle" | "validating" | "valid" | "invalid";

interface ApiKeyState {
  primaryKey: string;
  chainOverrides: Partial<Record<ChainSlug, string>>;
  validationStates: Record<string, ValidationState>;
  validationErrors: Record<string, string>;
}

interface ApiKeyContextValue extends ApiKeyState {
  setPrimaryKey: (key: string) => void;
  setChainOverride: (chain: ChainSlug, key: string) => void;
  getKeyForChain: (chain: ChainSlug) => string | undefined;
  setValidation: (fieldKey: string, state: ValidationState, error?: string) => void;
  getValidation: (fieldKey: string) => { state: ValidationState; error: string };
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

interface ApiKeyProviderProps {
  children: React.ReactNode;
  initialPrimaryKey?: string;
  initialChainOverrides?: Partial<Record<ChainSlug, string>>;
}

export function ApiKeyProvider({ children, initialPrimaryKey, initialChainOverrides }: ApiKeyProviderProps) {
  const [state, setState] = useState<ApiKeyState>({
    primaryKey: initialPrimaryKey ?? "",
    chainOverrides: initialChainOverrides ?? {},
    validationStates: {},
    validationErrors: {},
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

  return (
    <ApiKeyContext.Provider
      value={{ ...state, setPrimaryKey, setChainOverride, getKeyForChain, setValidation, getValidation }}
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
