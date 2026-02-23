// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { ApiKeyProvider, useApiKeys } from "@/lib/api-key-context";

function createWrapper(
  props: Partial<React.ComponentProps<typeof ApiKeyProvider>> = {}
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ApiKeyProvider {...props}>{children}</ApiKeyProvider>;
  };
}

describe("api-key-context", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when useApiKeys is used outside ApiKeyProvider", () => {
    // Suppress console.error from React for the expected error
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useApiKeys());
    }).toThrow("useApiKeys must be used within an ApiKeyProvider");
  });

  it("has correct default state", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    expect(result.current.primaryKey).toBe("");
    expect(result.current.chainOverrides).toEqual({});
  });

  it("honors initialPrimaryKey and initialChainOverrides props", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper({
        initialPrimaryKey: "my-key",
        initialChainOverrides: { ethereum: "eth-key", polygon: "poly-key" },
      }),
    });

    expect(result.current.primaryKey).toBe("my-key");
    expect(result.current.chainOverrides).toEqual({
      ethereum: "eth-key",
      polygon: "poly-key",
    });
  });

  it("setPrimaryKey updates primaryKey", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setPrimaryKey("new-primary-key");
    });

    expect(result.current.primaryKey).toBe("new-primary-key");
  });

  it("setChainOverride updates chainOverrides for a specific chain", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setChainOverride("arbitrum", "arb-key");
    });

    expect(result.current.chainOverrides).toEqual({ arbitrum: "arb-key" });
  });

  it("getKeyForChain returns chain override when it takes precedence over primary key", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper({
        initialPrimaryKey: "primary",
        initialChainOverrides: { base: "base-override" },
      }),
    });

    expect(result.current.getKeyForChain("base")).toBe("base-override");
  });

  it("getKeyForChain falls back to primary key when no override exists", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper({
        initialPrimaryKey: "fallback-key",
      }),
    });

    expect(result.current.getKeyForChain("optimism")).toBe("fallback-key");
  });

  it("getKeyForChain returns undefined when no key is available", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    expect(result.current.getKeyForChain("polygon")).toBeUndefined();
  });

  it("hasKeyForChain returns true when serverKeyAvailable is true even without client keys", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper({
        serverKeyAvailable: true,
      }),
    });

    expect(result.current.hasKeyForChain("ethereum")).toBe(true);
    expect(result.current.hasKeyForChain("arbitrum")).toBe(true);
  });

  it("setValidation and getValidation store and retrieve validation state and error", () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    // Default validation state
    expect(result.current.getValidation("primary")).toEqual({
      state: "empty",
      error: "",
    });

    act(() => {
      result.current.setValidation("primary", "validating");
    });

    expect(result.current.getValidation("primary")).toEqual({
      state: "validating",
      error: "",
    });

    act(() => {
      result.current.setValidation("primary", "invalid", "Key is expired");
    });

    expect(result.current.getValidation("primary")).toEqual({
      state: "invalid",
      error: "Key is expired",
    });
  });
});
