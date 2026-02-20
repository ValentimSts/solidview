# Home Page Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add API key side panel, home navigation, dark mode toggle, and recent search history to Solidview.

**Architecture:** New persistent nav header in root layout wrapping all pages. Client-side providers for theming (next-themes) and API key state (React Context). Recent searches persisted in localStorage. API key validation via a new server endpoint that tests keys against Etherscan V2.

**Tech Stack:** Next.js 16, next-themes, shadcn/ui (Sheet, Collapsible), lucide-react icons, localStorage, React Context

---

### Task 1: Install Dependencies and Add shadcn/ui Components

**Files:**
- Modify: `package.json`

**Step 1: Install next-themes**

Run: `pnpm add next-themes`

**Step 2: Add shadcn/ui Sheet component**

Run: `pnpm dlx shadcn@latest add sheet`

**Step 3: Add shadcn/ui Collapsible component**

Run: `pnpm dlx shadcn@latest add collapsible`

**Step 4: Add shadcn/ui Tooltip component (for nav icon buttons)**

Run: `pnpm dlx shadcn@latest add tooltip`

**Step 5: Verify build**

Run: `pnpm build`
Expected: Clean build, no errors.

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml components/ui/sheet.tsx components/ui/collapsible.tsx components/ui/tooltip.tsx
git commit -m "chore: add next-themes, sheet, collapsible, and tooltip dependencies"
```

---

### Task 2: Dark Mode — ThemeProvider and Toggle

**Files:**
- Create: `components/providers.tsx`
- Create: `components/theme-toggle.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create the providers wrapper**

Create `components/providers.tsx`:

```tsx
"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

**Step 2: Create the theme toggle component**

Create `components/theme-toggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const themes = ["system", "light", "dark"] as const;
const icons = { system: Monitor, light: Sun, dark: Moon } as const;
const labels = { system: "System", light: "Light", dark: "Dark" } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled className="size-9" />;
  }

  const current = (theme ?? "system") as (typeof themes)[number];
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  const Icon = icons[current];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(next)}
          aria-label={`Switch to ${labels[next]} theme`}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{labels[current]} theme</TooltipContent>
    </Tooltip>
  );
}
```

**Step 3: Update root layout**

Modify `app/layout.tsx` to wrap children with `Providers` and add `suppressHydrationWarning` to `<html>`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Solidview",
  description:
    "Explore, understand, and interact with any verified Ethereum smart contract.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add components/providers.tsx components/theme-toggle.tsx app/layout.tsx
git commit -m "feat: add dark mode support with next-themes"
```

---

### Task 3: Persistent Nav Header

**Files:**
- Create: `components/nav-header.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

**Step 1: Create the nav header component**

Create `components/nav-header.tsx`:

```tsx
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Solidview
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```

**Step 2: Add NavHeader to root layout**

Modify `app/layout.tsx` — add `NavHeader` inside `<Providers>`, before `{children}`:

```tsx
import { NavHeader } from "@/components/nav-header";
// ... existing imports ...

// Inside the Providers wrapper:
<Providers>
  <NavHeader />
  {children}
</Providers>
```

**Step 3: Remove duplicate title from home page**

Modify `app/page.tsx` — the header now shows "Solidview", so remove the `<h1>` and keep just the tagline:

```tsx
import { AddressInput } from "@/components/address-input";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Solidview</h1>
        <p className="text-lg text-muted-foreground">
          Explore, understand, and interact with any verified smart contract.
        </p>
      </div>
      <AddressInput />
    </main>
  );
}
```

Note: Change `min-h-screen` to `min-h-[calc(100vh-3.5rem)]` to account for the 3.5rem (h-14) header height. Keep the h1 for SEO/accessibility on the home page.

**Step 4: Verify build and visually check**

Run: `pnpm build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add components/nav-header.tsx app/layout.tsx app/page.tsx
git commit -m "feat: add persistent navigation header with home link"
```

---

### Task 4: API Key Context

**Files:**
- Create: `lib/api-key-context.tsx`
- Modify: `components/providers.tsx`

**Step 1: Create the API key context**

Create `lib/api-key-context.tsx`:

```tsx
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
```

**Step 2: Add ApiKeyProvider to providers**

Modify `components/providers.tsx` — wrap children with `ApiKeyProvider`:

```tsx
"use client";

import { ThemeProvider } from "next-themes";
import { ApiKeyProvider } from "@/lib/api-key-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ApiKeyProvider>{children}</ApiKeyProvider>
    </ThemeProvider>
  );
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add lib/api-key-context.tsx components/providers.tsx
git commit -m "feat: add API key context for client-side key management"
```

---

### Task 5: API Key Validation Endpoint

**Files:**
- Create: `app/api/keys/validate/route.ts`

**Step 1: Create the validation endpoint**

Create `app/api/keys/validate/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { apiKey, chainId } = body;

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { valid: false, error: "API key is required" },
      { status: 400 }
    );
  }

  if (!chainId || typeof chainId !== "number") {
    return NextResponse.json(
      { valid: false, error: "Chain ID is required" },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://api.etherscan.io/v2/api");
    url.searchParams.set("chainid", String(chainId));
    url.searchParams.set("module", "stats");
    url.searchParams.set("action", "ethsupply");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "1") {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({
      valid: false,
      error: data.result || "Invalid API key",
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build, new route `/api/keys/validate` appears.

**Step 3: Commit**

```bash
git add app/api/keys/validate/route.ts
git commit -m "feat: add API key validation endpoint"
```

---

### Task 6: API Key Side Panel

**Files:**
- Create: `components/api-key-panel.tsx`
- Modify: `components/nav-header.tsx`

**Step 1: Create the API key panel component**

Create `components/api-key-panel.tsx`. This is the largest component — it contains:
- A Sheet triggered by a Key icon button
- A primary API key input at the top
- A collapsible per-chain overrides section
- Validation logic with spinner → checkmark/shake animations
- Error messages with slide-up/down animations

```tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { KeyRound, Check, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApiKeys } from "@/lib/api-key-context";
import { getAllChains } from "@/lib/chains";
import type { ChainSlug } from "@/types/contract";

type ValidationState = "idle" | "validating" | "valid" | "invalid";

interface KeyFieldProps {
  label: string;
  value: string;
  chainId: number;
  onChange: (value: string) => void;
}

function truncateKey(key: string): string {
  if (key.length <= 14) return key;
  return `${key.slice(0, 6)}\u2026${key.slice(-5)}`;
}

function KeyField({ label, value, chainId, onChange }: KeyFieldProps) {
  const [validation, setValidation] = useState<ValidationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const validate = useCallback(
    async (key: string) => {
      if (!key.trim()) {
        setValidation("idle");
        return;
      }

      setValidation("validating");
      setError(null);
      setShowError(false);

      try {
        const res = await fetch("/api/keys/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: key.trim(), chainId }),
        });
        const data = await res.json();

        if (data.valid) {
          setValidation("valid");
        } else {
          setValidation("invalid");
          setError(data.error || "Invalid API key");
          setTimeout(() => setShowError(true), 50);
        }
      } catch {
        setValidation("invalid");
        setError("Failed to validate key");
        setTimeout(() => setShowError(true), 50);
      }
    },
    [chainId]
  );

  function handleChange(newValue: string) {
    onChange(newValue);
    setValidation("idle");
    setShowError(false);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (newValue.trim()) {
      debounceRef.current = setTimeout(() => validate(newValue), 600);
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          type="text"
          value={isEditing ? value : value ? truncateKey(value) : ""}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          placeholder="Paste API key..."
          className={`pr-9 font-mono text-sm ${
            validation === "invalid" ? "animate-shake border-destructive" : ""
          }`}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {validation === "validating" && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
          {validation === "valid" && (
            <Check className="size-4 text-green-500" />
          )}
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          showError && error ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      </div>
    </div>
  );
}

const chains = getAllChains();

export function ApiKeyPanel() {
  const { primaryKey, chainOverrides, setPrimaryKey, setChainOverride } =
    useApiKeys();
  const [overridesOpen, setOverridesOpen] = useState(false);

  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="API Keys">
              <KeyRound className="size-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>API Keys</TooltipContent>
      </Tooltip>
      <SheetContent side="left" className="w-80 overflow-y-auto sm:w-96">
        <SheetHeader>
          <SheetTitle>API Keys</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-1 pt-4">
          <KeyField
            label="Etherscan API Key"
            value={primaryKey}
            chainId={1}
            onChange={setPrimaryKey}
          />

          <Collapsible open={overridesOpen} onOpenChange={setOverridesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm text-muted-foreground">
                  Per-chain overrides
                </span>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${
                    overridesOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {chains.map((chain) => (
                <KeyField
                  key={chain.slug}
                  label={chain.name}
                  value={chainOverrides[chain.slug] ?? ""}
                  chainId={chain.chainId}
                  onChange={(val) =>
                    setChainOverride(chain.slug as ChainSlug, val)
                  }
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Add shake animation to globals.css**

Add to the end of `app/globals.css`, inside the `@layer base` block or after it:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

.animate-shake {
  animation: shake 0.4s ease-in-out;
}
```

**Step 3: Add ApiKeyPanel to nav header**

Modify `components/nav-header.tsx` — add the key button to the left section:

```tsx
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ApiKeyPanel } from "@/components/api-key-panel";

export function NavHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <ApiKeyPanel />
          <Link href="/" className="text-lg font-bold tracking-tight">
            Solidview
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add components/api-key-panel.tsx components/nav-header.tsx app/globals.css
git commit -m "feat: add API key side panel with validation and per-chain overrides"
```

---

### Task 7: Wire Client API Keys to Contract Fetching

**Files:**
- Modify: `app/api/contract/[chain]/[address]/route.ts`
- Modify: `components/address-input.tsx`

**Step 1: Accept client API key in contract API route**

Modify `app/api/contract/[chain]/[address]/route.ts` — check for `x-api-key` header before falling back to server env:

```ts
// After chain validation, before fetching:
const clientKey = _request.headers.get("x-api-key");
const apiKey = clientKey || process.env.ETHERSCAN_API_KEY;

if (!apiKey) {
  return NextResponse.json(
    { error: "Etherscan API key not configured" },
    { status: 500 }
  );
}
```

Then pass `apiKey` to the fetch functions. This requires updating `fetchContractAbi` and `fetchContractSource` to accept an optional `apiKey` parameter override.

Modify `lib/etherscan.ts` — add optional `apiKey` parameter to both functions:

```ts
export async function fetchContractAbi(
  chainId: number,
  address: string,
  apiKey?: string
): Promise<Abi> {
  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getabi");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey ?? getApiKey());
  // ... rest unchanged
}

export async function fetchContractSource(
  chainId: number,
  address: string,
  apiKey?: string
): Promise<{ metadata: ContractMetadata; source: ContractSource }> {
  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey ?? getApiKey());
  // ... rest unchanged
}
```

Update the contract route to use the apiKey:

```ts
const [abi, { metadata, source }] = await Promise.all([
  fetchContractAbi(chainConfig.chainId, address, apiKey),
  fetchContractSource(chainConfig.chainId, address, apiKey),
]);
```

**Step 2: Pass client key from address-input on navigation**

Modify `components/address-input.tsx` — when navigating to a contract page, include the API key as a query parameter or use the context for client-side fetching. Since the contract page is a Server Component, the simplest approach is to pass the key via the fetch call from a client-side wrapper. For now, the client key will be available for the API route via the existing `/api/contract/` proxy.

Actually, since the contract page (`app/[chain]/[address]/page.tsx`) is a Server Component that directly calls `fetchContractAbi`/`fetchContractSource`, and client-side keys live in React Context, we need the contract page to fall through to the client-side API route when no server key is configured. Update `app/[chain]/[address]/page.tsx` to try server-side fetch first, and if no server key, render a client component that fetches via the API route with the client key.

This is a larger refactor — create a client-side contract loader:

Create `components/contract-loader.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useApiKeys } from "@/lib/api-key-context";
import type { ChainSlug } from "@/types/contract";

interface ContractLoaderProps {
  chain: ChainSlug;
  address: string;
  children: (data: { abi: unknown; metadata: unknown; source: unknown }) => React.ReactNode;
  fallback: React.ReactNode;
  errorFallback: (error: string) => React.ReactNode;
}

export function ContractLoader({
  chain,
  address,
  children,
  fallback,
  errorFallback,
}: ContractLoaderProps) {
  const { getKeyForChain } = useApiKeys();
  const [data, setData] = useState<{ abi: unknown; metadata: unknown; source: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = getKeyForChain(chain);
    if (!key) {
      setError("No API key configured. Add one via the key icon in the header.");
      setLoading(false);
      return;
    }

    fetch(`/api/contract/${chain}/${address}`, {
      headers: { "x-api-key": key },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Failed to fetch contract data"))
      .finally(() => setLoading(false));
  }, [chain, address, getKeyForChain]);

  if (loading) return fallback;
  if (error) return errorFallback(error);
  if (data) return children(data);
  return null;
}
```

Then modify `app/[chain]/[address]/page.tsx` to render `ContractLoader` when no server-side key is available instead of the static "API Key Required" message.

**Step 3: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add lib/etherscan.ts app/api/contract/[chain]/[address]/route.ts components/contract-loader.tsx app/[chain]/[address]/page.tsx components/address-input.tsx
git commit -m "feat: wire client-provided API keys to contract fetching"
```

---

### Task 8: Recent Searches

**Files:**
- Create: `lib/recent-searches.ts`
- Create: `components/recent-searches.tsx`
- Modify: `components/address-input.tsx`
- Modify: `app/page.tsx`

**Step 1: Create recent searches utility**

Create `lib/recent-searches.ts`:

```ts
import type { ChainSlug } from "@/types/contract";

export interface RecentSearch {
  address: string;
  chain: ChainSlug;
  timestamp: number;
}

const STORAGE_KEY = "solidview:recent-searches";
const MAX_ENTRIES = 5;

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(address: string, chain: ChainSlug): void {
  const searches = getRecentSearches().filter(
    (s) => !(s.address.toLowerCase() === address.toLowerCase() && s.chain === chain)
  );
  searches.unshift({ address, chain, timestamp: Date.now() });
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(searches.slice(0, MAX_ENTRIES))
  );
}
```

**Step 2: Create recent searches component**

Create `components/recent-searches.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentSearches, type RecentSearch } from "@/lib/recent-searches";
import { Badge } from "@/components/ui/badge";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
}

export function RecentSearches() {
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setSearches(getRecentSearches());
  }, []);

  if (searches.length === 0) return null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">
        Recently searched
      </p>
      <div className="flex flex-wrap gap-2">
        {searches.map((s) => (
          <Link
            key={`${s.chain}-${s.address}`}
            href={`/${s.chain}/${s.address}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors hover:bg-accent"
          >
            <span className="font-mono text-xs">
              {truncateAddress(s.address)}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {s.chain}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Add search saving to address-input**

Modify `components/address-input.tsx` — import `addRecentSearch` and call it right before `router.push`:

```ts
import { addRecentSearch } from "@/lib/recent-searches";

// Inside handleSubmit, right before router.push:
addRecentSearch(trimmed, chain);
router.push(`/${chain}/${trimmed}`);
```

**Step 4: Add RecentSearches to home page**

Modify `app/page.tsx` — add `RecentSearches` below `AddressInput`:

```tsx
import { AddressInput } from "@/components/address-input";
import { RecentSearches } from "@/components/recent-searches";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Solidview</h1>
        <p className="text-lg text-muted-foreground">
          Explore, understand, and interact with any verified smart contract.
        </p>
      </div>
      <AddressInput />
      <RecentSearches />
    </main>
  );
}
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 6: Commit**

```bash
git add lib/recent-searches.ts components/recent-searches.tsx components/address-input.tsx app/page.tsx
git commit -m "feat: add recently searched contracts section with localStorage persistence"
```

---

### Task 9: Visual Verification and Final Polish

**Step 1: Start dev server and visually verify all features**

Run: `pnpm dev`

Check:
- Nav header visible on home page and contract pages
- Key icon opens side panel from the left
- Primary key field validates (paste a real key or test key)
- Per-chain overrides expand and collapse
- Shake animation on invalid key
- Error message slides down and back up
- Dark mode toggle cycles system → light → dark
- Dark mode persists on page refresh
- Recent searches appear after submitting a search
- Recent search entries link to correct pages
- Home link in header navigates back to home from contract page

**Step 2: Run tests**

Run: `pnpm test`
Expected: All existing tests pass (18 tests).

**Step 3: Run build**

Run: `pnpm build`
Expected: Clean build.

**Step 4: Update CHANGELOG**

Add entries under `[Unreleased]` in `CHANGELOG.md` for all new features.

**Step 5: Commit any polish fixes**

```bash
git add -A  # be selective about what changed
git commit -m "chore: polish home page enhancements"
```
