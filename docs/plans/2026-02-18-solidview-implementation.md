# Solidview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a read-only smart contract explorer where users paste a verified contract address, select a chain, and get a human-readable breakdown of functions, events, storage layout — with the ability to query read functions directly.

**Architecture:** Next.js 15 App Router monolith. Server Components fetch contract data from Etherscan APIs at request time. Client Components handle interactive function calls and tab switching. Fully stateless — URL is the state (`/{chain}/{address}`).

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui, viem, Vitest, Playwright, pnpm

**Design doc:** `docs/plans/2026-02-18-stack-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `app/`, `components/`, `lib/`, `types/` directories (via create-next-app + manual)
- Create: `.env.local` (gitignored)
- Create: `.env.example`
- Modify: `package.json` (add scripts, deps)

**Step 1: Scaffold Next.js project in current directory**

Since the repo already has files (README.md, LICENSE, CHANGELOG.md, docs/), scaffold into a temp directory and move files in:

```bash
cd /home/val/projects/Blockchain/solidview
pnpm create next-app@latest solidview-temp --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack --yes
```

Then move the scaffolded files (excluding README, LICENSE, etc.) into the current repo root:

```bash
# Move all scaffolded files into repo root (don't overwrite existing files we want to keep)
cp -rn solidview-temp/* .
cp -rn solidview-temp/.eslintrc* . 2>/dev/null || true
cp -rn solidview-temp/.gitignore . 2>/dev/null || true
cp solidview-temp/next.config.ts . 2>/dev/null || true
cp solidview-temp/tsconfig.json . 2>/dev/null || true
cp solidview-temp/package.json . 2>/dev/null || true
cp -r solidview-temp/app . 2>/dev/null || true
cp -r solidview-temp/public . 2>/dev/null || true
rm -rf solidview-temp
```

**Step 2: Install core dependencies**

```bash
pnpm install
pnpm add viem
pnpm add -D vitest @vitejs/plugin-react prettier
```

**Step 3: Add Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

**Step 4: Add scripts to package.json**

Add/update these scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

**Step 5: Create `.env.example`**

```env
ETHERSCAN_API_KEY=
ARBISCAN_API_KEY=
OPTIMISM_ETHERSCAN_API_KEY=
BASESCAN_API_KEY=
POLYGONSCAN_API_KEY=
```

**Step 6: Create `.env.local` from example**

Copy `.env.example` to `.env.local` and fill in real keys. Verify `.env.local` is in `.gitignore`.

**Step 7: Create directory structure**

```bash
mkdir -p lib types components/ui components/contract
```

**Step 8: Verify setup**

```bash
pnpm dev
# Should start on http://localhost:3000 with default Next.js page
# Ctrl+C to stop

pnpm build
# Should build successfully

pnpm test
# Should run (0 tests found is fine at this point)
```

**Step 9: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

When prompted, accept defaults (New York style, zinc base color, CSS variables). This creates `components/ui/` and configures `lib/utils.ts`.

**Step 10: Install shadcn components needed for MVP**

```bash
pnpm dlx shadcn@latest add button card input tabs badge separator copy-button
```

**Step 11: Commit**

```bash
git add -A
# Manually exclude: .claude/ CLAUDE.md
git reset HEAD .claude/ CLAUDE.md
git commit -m "chore: scaffold Next.js project with Tailwind, shadcn/ui, viem, and vitest"
```

---

## Task 2: Types and Chain Configuration

**Files:**
- Create: `types/contract.ts`
- Create: `lib/chains.ts`
- Create: `__tests__/lib/chains.test.ts`

**Step 1: Write the types**

Create `types/contract.ts` with shared types used throughout the app:

```typescript
import type { Abi, AbiEvent, AbiFunction } from "viem";

export type ChainSlug =
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon";

export interface ChainConfig {
  slug: ChainSlug;
  name: string;
  chainId: number;
  explorerApiUrl: string;
  explorerApiKeyEnv: string;
  explorerUrl: string;
  rpcUrl: string;
}

export interface ContractMetadata {
  name: string;
  compilerVersion: string;
  optimizationUsed: boolean;
  runs: number;
  license: string;
  evmVersion: string;
}

export interface ContractSource {
  /** Main source or map of filename -> source for multi-file contracts */
  files: Record<string, string>;
  language: string;
}

export interface ParsedContract {
  address: string;
  chain: ChainSlug;
  abi: Abi;
  metadata: ContractMetadata;
  source: ContractSource;
  readFunctions: AbiFunction[];
  writeFunctions: AbiFunction[];
  events: AbiEvent[];
}
```

**Step 2: Write failing test for chain config**

Create `__tests__/lib/chains.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getChainConfig, getAllChains, isValidChainSlug } from "@/lib/chains";

describe("chains", () => {
  it("returns config for ethereum", () => {
    const config = getChainConfig("ethereum");
    expect(config).toBeDefined();
    expect(config.chainId).toBe(1);
    expect(config.slug).toBe("ethereum");
  });

  it("returns config for all supported chains", () => {
    const slugs = ["ethereum", "arbitrum", "optimism", "base", "polygon"] as const;
    for (const slug of slugs) {
      const config = getChainConfig(slug);
      expect(config).toBeDefined();
      expect(config.slug).toBe(slug);
    }
  });

  it("throws for unknown chain", () => {
    expect(() => getChainConfig("solana" as any)).toThrow();
  });

  it("getAllChains returns all 5 chains", () => {
    const chains = getAllChains();
    expect(chains).toHaveLength(5);
  });

  it("validates chain slugs", () => {
    expect(isValidChainSlug("ethereum")).toBe(true);
    expect(isValidChainSlug("arbitrum")).toBe(true);
    expect(isValidChainSlug("solana")).toBe(false);
    expect(isValidChainSlug("")).toBe(false);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
pnpm test __tests__/lib/chains.test.ts
```

Expected: FAIL — module `@/lib/chains` not found.

**Step 4: Implement chain config**

Create `lib/chains.ts`:

```typescript
import type { ChainSlug, ChainConfig } from "@/types/contract";

const chains: Record<ChainSlug, ChainConfig> = {
  ethereum: {
    slug: "ethereum",
    name: "Ethereum",
    chainId: 1,
    explorerApiUrl: "https://api.etherscan.io/api",
    explorerApiKeyEnv: "ETHERSCAN_API_KEY",
    explorerUrl: "https://etherscan.io",
    rpcUrl: "https://eth.llamarpc.com",
  },
  arbitrum: {
    slug: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    explorerApiUrl: "https://api.arbiscan.io/api",
    explorerApiKeyEnv: "ARBISCAN_API_KEY",
    explorerUrl: "https://arbiscan.io",
    rpcUrl: "https://arbitrum.llamarpc.com",
  },
  optimism: {
    slug: "optimism",
    name: "Optimism",
    chainId: 10,
    explorerApiUrl: "https://api-optimistic.etherscan.io/api",
    explorerApiKeyEnv: "OPTIMISM_ETHERSCAN_API_KEY",
    explorerUrl: "https://optimistic.etherscan.io",
    rpcUrl: "https://optimism.llamarpc.com",
  },
  base: {
    slug: "base",
    name: "Base",
    chainId: 8453,
    explorerApiUrl: "https://api.basescan.org/api",
    explorerApiKeyEnv: "BASESCAN_API_KEY",
    explorerUrl: "https://basescan.org",
    rpcUrl: "https://base.llamarpc.com",
  },
  polygon: {
    slug: "polygon",
    name: "Polygon",
    chainId: 137,
    explorerApiUrl: "https://api.polygonscan.com/api",
    explorerApiKeyEnv: "POLYGONSCAN_API_KEY",
    explorerUrl: "https://polygonscan.com",
    rpcUrl: "https://polygon.llamarpc.com",
  },
};

export function getChainConfig(slug: ChainSlug): ChainConfig {
  const config = chains[slug];
  if (!config) {
    throw new Error(`Unknown chain: ${slug}`);
  }
  return config;
}

export function getAllChains(): ChainConfig[] {
  return Object.values(chains);
}

export function isValidChainSlug(value: string): value is ChainSlug {
  return value in chains;
}
```

**Step 5: Run tests to verify they pass**

```bash
pnpm test __tests__/lib/chains.test.ts
```

Expected: all 5 tests PASS.

**Step 6: Commit**

```bash
git add types/contract.ts lib/chains.ts __tests__/lib/chains.test.ts
git commit -m "feat: add shared types and chain configuration"
```

---

## Task 3: Etherscan API Client

**Files:**
- Create: `lib/etherscan.ts`
- Create: `__tests__/lib/etherscan.test.ts`

**Step 1: Write failing tests**

Create `__tests__/lib/etherscan.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchContractAbi, fetchContractSource } from "@/lib/etherscan";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("etherscan", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchContractAbi", () => {
    it("returns parsed ABI for a verified contract", async () => {
      const fakeAbi = [
        {
          type: "function",
          name: "balanceOf",
          inputs: [{ name: "owner", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: JSON.stringify(fakeAbi),
        }),
      });

      const abi = await fetchContractAbi(
        "https://api.etherscan.io/api",
        "test-key",
        "0x1234567890123456789012345678901234567890"
      );

      expect(abi).toEqual(fakeAbi);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("throws when contract is not verified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "0",
          result: "Contract source code not verified",
        }),
      });

      await expect(
        fetchContractAbi(
          "https://api.etherscan.io/api",
          "test-key",
          "0x1234567890123456789012345678901234567890"
        )
      ).rejects.toThrow("Contract source code not verified");
    });
  });

  describe("fetchContractSource", () => {
    it("returns source code and metadata", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: [
            {
              SourceCode: "pragma solidity ^0.8.0; contract Foo {}",
              ContractName: "Foo",
              CompilerVersion: "v0.8.20",
              OptimizationUsed: "1",
              Runs: "200",
              LicenseType: "MIT",
              EVMVersion: "paris",
            },
          ],
        }),
      });

      const result = await fetchContractSource(
        "https://api.etherscan.io/api",
        "test-key",
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.metadata.name).toBe("Foo");
      expect(result.metadata.compilerVersion).toBe("v0.8.20");
      expect(result.metadata.optimizationUsed).toBe(true);
      expect(result.metadata.runs).toBe(200);
      expect(result.source.files).toHaveProperty("Foo.sol");
    });

    it("handles multi-file contracts (JSON source)", async () => {
      const multiSource = JSON.stringify({
        sources: {
          "contracts/Foo.sol": { content: "pragma solidity ^0.8.0;" },
          "contracts/Bar.sol": { content: "import './Foo.sol';" },
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: [
            {
              // Etherscan wraps multi-file JSON in extra braces: {{...}}
              SourceCode: `{${multiSource}}`,
              ContractName: "Foo",
              CompilerVersion: "v0.8.20",
              OptimizationUsed: "0",
              Runs: "200",
              LicenseType: "MIT",
              EVMVersion: "paris",
            },
          ],
        }),
      });

      const result = await fetchContractSource(
        "https://api.etherscan.io/api",
        "test-key",
        "0x1234567890123456789012345678901234567890"
      );

      expect(Object.keys(result.source.files)).toHaveLength(2);
      expect(result.source.files["contracts/Foo.sol"]).toBe(
        "pragma solidity ^0.8.0;"
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test __tests__/lib/etherscan.test.ts
```

Expected: FAIL — module `@/lib/etherscan` not found.

**Step 3: Implement Etherscan client**

Create `lib/etherscan.ts`:

```typescript
import type { Abi } from "viem";
import type { ContractMetadata, ContractSource } from "@/types/contract";

export class EtherscanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EtherscanError";
  }
}

export async function fetchContractAbi(
  apiUrl: string,
  apiKey: string,
  address: string
): Promise<Abi> {
  const url = new URL(apiUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getabi");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "1") {
    throw new EtherscanError(data.result || "Failed to fetch ABI");
  }

  return JSON.parse(data.result) as Abi;
}

export async function fetchContractSource(
  apiUrl: string,
  apiKey: string,
  address: string
): Promise<{ metadata: ContractMetadata; source: ContractSource }> {
  const url = new URL(apiUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "1" || !data.result?.[0]) {
    throw new EtherscanError(data.result || "Failed to fetch source code");
  }

  const result = data.result[0];

  const metadata: ContractMetadata = {
    name: result.ContractName,
    compilerVersion: result.CompilerVersion,
    optimizationUsed: result.OptimizationUsed === "1",
    runs: parseInt(result.Runs, 10),
    license: result.LicenseType || "Unknown",
    evmVersion: result.EVMVersion || "default",
  };

  const source = parseSourceCode(result.SourceCode, result.ContractName);

  return { metadata, source };
}

function parseSourceCode(
  rawSource: string,
  contractName: string
): ContractSource {
  // Etherscan wraps multi-file JSON in double braces: {{...}}
  if (rawSource.startsWith("{{")) {
    const jsonStr = rawSource.slice(1, -1);
    const parsed = JSON.parse(jsonStr);
    const files: Record<string, string> = {};

    if (parsed.sources) {
      for (const [path, data] of Object.entries(parsed.sources)) {
        files[path] = (data as { content: string }).content;
      }
    }

    return { files, language: "Solidity" };
  }

  // Single file source
  return {
    files: { [`${contractName}.sol`]: rawSource },
    language: "Solidity",
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/lib/etherscan.test.ts
```

Expected: all 4 tests PASS.

**Step 5: Commit**

```bash
git add lib/etherscan.ts __tests__/lib/etherscan.test.ts
git commit -m "feat: add Etherscan API client with ABI and source fetching"
```

---

## Task 4: ABI Parsing Utilities

**Files:**
- Create: `lib/abi-utils.ts`
- Create: `__tests__/lib/abi-utils.test.ts`

**Step 1: Write failing tests**

Create `__tests__/lib/abi-utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { Abi } from "viem";
import { parseContractAbi, formatParamType } from "@/lib/abi-utils";

const sampleAbi: Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
    stateMutability: "pure",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true, internalType: "address" },
      { name: "to", type: "address", indexed: true, internalType: "address" },
      { name: "value", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "spender", type: "address", indexed: true, internalType: "address" },
      { name: "value", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
];

describe("abi-utils", () => {
  describe("parseContractAbi", () => {
    it("separates read functions (view + pure)", () => {
      const { readFunctions } = parseContractAbi(sampleAbi);
      expect(readFunctions).toHaveLength(3);
      expect(readFunctions.map((f) => f.name).sort()).toEqual([
        "balanceOf",
        "decimals",
        "name",
      ]);
    });

    it("separates write functions (nonpayable + payable)", () => {
      const { writeFunctions } = parseContractAbi(sampleAbi);
      expect(writeFunctions).toHaveLength(1);
      expect(writeFunctions[0].name).toBe("transfer");
    });

    it("extracts events", () => {
      const { events } = parseContractAbi(sampleAbi);
      expect(events).toHaveLength(2);
      expect(events.map((e) => e.name).sort()).toEqual([
        "Approval",
        "Transfer",
      ]);
    });

    it("ignores non-function/event entries", () => {
      const { readFunctions, writeFunctions, events } =
        parseContractAbi(sampleAbi);
      const total =
        readFunctions.length + writeFunctions.length + events.length;
      // constructor should not be in any category
      expect(total).toBe(6);
    });

    it("handles empty ABI", () => {
      const { readFunctions, writeFunctions, events } = parseContractAbi([]);
      expect(readFunctions).toHaveLength(0);
      expect(writeFunctions).toHaveLength(0);
      expect(events).toHaveLength(0);
    });
  });

  describe("formatParamType", () => {
    it("formats address type", () => {
      expect(formatParamType("address")).toBe("address");
    });

    it("formats uint256 type", () => {
      expect(formatParamType("uint256")).toBe("uint256");
    });

    it("formats array types", () => {
      expect(formatParamType("uint256[]")).toBe("uint256[]");
    });

    it("formats tuple types", () => {
      expect(formatParamType("tuple")).toBe("tuple");
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test __tests__/lib/abi-utils.test.ts
```

Expected: FAIL — module `@/lib/abi-utils` not found.

**Step 3: Implement ABI utilities**

Create `lib/abi-utils.ts`:

```typescript
import type { Abi, AbiEvent, AbiFunction } from "viem";

export interface ParsedAbi {
  readFunctions: AbiFunction[];
  writeFunctions: AbiFunction[];
  events: AbiEvent[];
}

export function parseContractAbi(abi: Abi): ParsedAbi {
  const readFunctions: AbiFunction[] = [];
  const writeFunctions: AbiFunction[] = [];
  const events: AbiEvent[] = [];

  for (const item of abi) {
    if (item.type === "function") {
      if (
        item.stateMutability === "view" ||
        item.stateMutability === "pure"
      ) {
        readFunctions.push(item);
      } else {
        writeFunctions.push(item);
      }
    } else if (item.type === "event") {
      events.push(item);
    }
  }

  // Sort alphabetically by name for consistent display
  readFunctions.sort((a, b) => a.name.localeCompare(b.name));
  writeFunctions.sort((a, b) => a.name.localeCompare(b.name));
  events.sort((a, b) => a.name.localeCompare(b.name));

  return { readFunctions, writeFunctions, events };
}

export function formatParamType(type: string): string {
  return type;
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/lib/abi-utils.test.ts
```

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add lib/abi-utils.ts __tests__/lib/abi-utils.test.ts
git commit -m "feat: add ABI parsing utilities"
```

---

## Task 5: Viem Public Client Factory

**Files:**
- Create: `lib/viem-client.ts`
- Create: `__tests__/lib/viem-client.test.ts`

**Step 1: Write failing test**

Create `__tests__/lib/viem-client.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getPublicClient } from "@/lib/viem-client";

describe("viem-client", () => {
  it("creates a public client for ethereum", () => {
    const client = getPublicClient("ethereum");
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(1);
  });

  it("creates a public client for arbitrum", () => {
    const client = getPublicClient("arbitrum");
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(42161);
  });

  it("creates a public client for all supported chains", () => {
    const slugs = ["ethereum", "arbitrum", "optimism", "base", "polygon"] as const;
    for (const slug of slugs) {
      const client = getPublicClient(slug);
      expect(client).toBeDefined();
    }
  });

  it("throws for invalid chain", () => {
    expect(() => getPublicClient("solana" as any)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test __tests__/lib/viem-client.test.ts
```

Expected: FAIL — module `@/lib/viem-client` not found.

**Step 3: Implement viem client factory**

Create `lib/viem-client.ts`:

```typescript
import { createPublicClient, http, type PublicClient } from "viem";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
} from "viem/chains";
import type { ChainSlug } from "@/types/contract";
import { getChainConfig } from "@/lib/chains";

const viemChains = {
  ethereum: mainnet,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
  polygon: polygon,
} as const;

const clientCache = new Map<ChainSlug, PublicClient>();

export function getPublicClient(slug: ChainSlug): PublicClient {
  const cached = clientCache.get(slug);
  if (cached) return cached;

  const chainConfig = getChainConfig(slug);
  const viemChain = viemChains[slug];

  if (!viemChain) {
    throw new Error(`No viem chain for: ${slug}`);
  }

  const client = createPublicClient({
    chain: viemChain,
    transport: http(chainConfig.rpcUrl),
  });

  clientCache.set(slug, client);
  return client;
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/lib/viem-client.test.ts
```

Expected: all 4 tests PASS.

**Step 5: Commit**

```bash
git add lib/viem-client.ts __tests__/lib/viem-client.test.ts
git commit -m "feat: add viem public client factory with caching"
```

---

## Task 6: API Route (Etherscan Proxy)

**Files:**
- Create: `app/api/contract/[chain]/[address]/route.ts`

**Step 1: Implement the API route**

Create `app/api/contract/[chain]/[address]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { isValidChainSlug, getChainConfig } from "@/lib/chains";
import { fetchContractAbi, fetchContractSource } from "@/lib/etherscan";

interface RouteParams {
  params: Promise<{ chain: string; address: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain)) {
    return NextResponse.json(
      { error: `Unsupported chain: ${chain}` },
      { status: 400 }
    );
  }

  if (!isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address" },
      { status: 400 }
    );
  }

  const chainConfig = getChainConfig(chain);
  const apiKey = process.env[chainConfig.explorerApiKeyEnv];

  if (!apiKey) {
    return NextResponse.json(
      { error: `API key not configured for ${chainConfig.name}` },
      { status: 500 }
    );
  }

  try {
    const [abi, { metadata, source }] = await Promise.all([
      fetchContractAbi(chainConfig.explorerApiUrl, apiKey, address),
      fetchContractSource(chainConfig.explorerApiUrl, apiKey, address),
    ]);

    return NextResponse.json({ abi, metadata, source });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch contract data";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
```

**Step 2: Manually test**

```bash
pnpm dev &
# Wait for server to start, then test with a known verified contract (USDT on mainnet):
curl -s "http://localhost:3000/api/contract/ethereum/0xdAC17F958D2ee523a2206206994597C13D831ec7" | head -c 500
# Should return JSON with abi, metadata, source fields
# Kill dev server
kill %1
```

**Step 3: Commit**

```bash
git add app/api/contract/
git commit -m "feat: add API route proxying Etherscan for contract data"
```

---

## Task 7: Landing Page

**Files:**
- Create: `components/address-input.tsx`
- Create: `components/chain-selector.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Step 1: Build the chain selector component**

Create `components/chain-selector.tsx`:

```tsx
"use client";

import { getAllChains } from "@/lib/chains";
import type { ChainSlug } from "@/types/contract";

interface ChainSelectorProps {
  value: ChainSlug;
  onChange: (chain: ChainSlug) => void;
}

const chains = getAllChains();

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ChainSlug)}
      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {chains.map((chain) => (
        <option key={chain.slug} value={chain.slug}>
          {chain.name}
        </option>
      ))}
    </select>
  );
}
```

**Step 2: Build the address input component**

Create `components/address-input.tsx`:

```tsx
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
```

**Step 3: Update the landing page**

Replace the contents of `app/page.tsx`:

```tsx
import { AddressInput } from "@/components/address-input";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
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

**Step 4: Update root layout**

Modify `app/layout.tsx` — keep the existing structure but update metadata:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 5: Verify it renders**

```bash
pnpm dev
# Open http://localhost:3000 — should see "Solidview" heading, chain dropdown, address input, Explore button
# Try submitting an invalid address — should show error
# Try submitting a valid address — should navigate to /ethereum/0x...
```

**Step 6: Commit**

```bash
git add components/address-input.tsx components/chain-selector.tsx app/page.tsx app/layout.tsx
git commit -m "feat: add landing page with address input and chain selector"
```

---

## Task 8: Contract Dashboard Page (Server Component)

**Files:**
- Create: `app/[chain]/[address]/page.tsx`
- Create: `app/[chain]/[address]/loading.tsx`
- Create: `components/contract-header.tsx`

**Step 1: Build the contract header component**

Create `components/contract-header.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import type { ChainSlug, ContractMetadata } from "@/types/contract";
import { getChainConfig } from "@/lib/chains";

interface ContractHeaderProps {
  address: string;
  chain: ChainSlug;
  metadata: ContractMetadata;
  readCount: number;
  writeCount: number;
  eventCount: number;
}

export function ContractHeader({
  address,
  chain,
  metadata,
  readCount,
  writeCount,
  eventCount,
}: ContractHeaderProps) {
  const chainConfig = getChainConfig(chain);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{metadata.name}</h1>
        <Badge variant="secondary">{chainConfig.name}</Badge>
      </div>
      <p className="font-mono text-sm text-muted-foreground break-all">
        {address}
      </p>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>Compiler: {metadata.compilerVersion}</span>
        <span>{metadata.optimizationUsed ? `Optimized (${metadata.runs} runs)` : "Not optimized"}</span>
        <span>License: {metadata.license}</span>
      </div>
      <div className="flex gap-4 text-sm">
        <span>{readCount} read functions</span>
        <span>{writeCount} write functions</span>
        <span>{eventCount} events</span>
      </div>
    </div>
  );
}
```

**Step 2: Build the loading skeleton**

Create `app/[chain]/[address]/loading.tsx`:

```tsx
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-5 w-96 rounded bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
      </div>
      <Separator className="my-6" />
      <div className="flex gap-4 animate-pulse">
        <div className="h-10 w-24 rounded bg-muted" />
        <div className="h-10 w-24 rounded bg-muted" />
        <div className="h-10 w-24 rounded bg-muted" />
        <div className="h-10 w-24 rounded bg-muted" />
      </div>
      <div className="mt-6 space-y-4 animate-pulse">
        <div className="h-32 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
      </div>
    </div>
  );
}
```

**Step 3: Build the contract dashboard page**

Create `app/[chain]/[address]/page.tsx`. This is a Server Component that fetches data then renders client-interactive tabs:

```tsx
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { isValidChainSlug, getChainConfig } from "@/lib/chains";
import { fetchContractAbi, fetchContractSource } from "@/lib/etherscan";
import { parseContractAbi } from "@/lib/abi-utils";
import { Separator } from "@/components/ui/separator";
import { ContractHeader } from "@/components/contract-header";
import { ContractTabs } from "@/components/contract/contract-tabs";
import type { ChainSlug } from "@/types/contract";

interface PageProps {
  params: Promise<{ chain: string; address: string }>;
}

export default async function ContractPage({ params }: PageProps) {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain) || !isAddress(address)) {
    notFound();
  }

  const chainSlug = chain as ChainSlug;
  const chainConfig = getChainConfig(chainSlug);
  const apiKey = process.env[chainConfig.explorerApiKeyEnv];

  if (!apiKey) {
    throw new Error(`API key not configured for ${chainConfig.name}`);
  }

  let abi, metadata, source;
  try {
    [abi, { metadata: meta, source: src }] = await Promise.all([
      fetchContractAbi(chainConfig.explorerApiUrl, apiKey, address),
      fetchContractSource(chainConfig.explorerApiUrl, apiKey, address),
    ]);
    metadata = meta;
    source = src;
  } catch {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold">Contract Not Verified</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This contract is not verified on {chainConfig.name}, or no contract
            exists at this address.
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
            {address}
          </p>
        </div>
      </div>
    );
  }

  const { readFunctions, writeFunctions, events } = parseContractAbi(abi);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <ContractHeader
        address={address}
        chain={chainSlug}
        metadata={metadata}
        readCount={readFunctions.length}
        writeCount={writeFunctions.length}
        eventCount={events.length}
      />
      <Separator className="my-6" />
      <ContractTabs
        chain={chainSlug}
        address={address}
        readFunctions={readFunctions}
        events={events}
        source={source}
        abi={abi}
      />
    </div>
  );
}
```

Note: `ContractTabs` will be built in the next task. For now create a stub to make this compile:

Create `components/contract/contract-tabs.tsx` (stub):

```tsx
"use client";

import type { Abi, AbiEvent, AbiFunction } from "viem";
import type { ChainSlug, ContractSource } from "@/types/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContractTabsProps {
  chain: ChainSlug;
  address: string;
  readFunctions: AbiFunction[];
  events: AbiEvent[];
  source: ContractSource;
  abi: Abi;
}

export function ContractTabs({
  readFunctions,
  events,
  source,
}: ContractTabsProps) {
  return (
    <Tabs defaultValue="functions">
      <TabsList>
        <TabsTrigger value="functions">
          Read ({readFunctions.length})
        </TabsTrigger>
        <TabsTrigger value="events">
          Events ({events.length})
        </TabsTrigger>
        <TabsTrigger value="source">
          Source ({Object.keys(source.files).length} files)
        </TabsTrigger>
        <TabsTrigger value="storage">Storage</TabsTrigger>
      </TabsList>
      <TabsContent value="functions">
        <p className="text-muted-foreground">Read functions will go here.</p>
      </TabsContent>
      <TabsContent value="events">
        <p className="text-muted-foreground">Events will go here.</p>
      </TabsContent>
      <TabsContent value="source">
        <p className="text-muted-foreground">Source code will go here.</p>
      </TabsContent>
      <TabsContent value="storage">
        <p className="text-muted-foreground">Storage layout will go here.</p>
      </TabsContent>
    </Tabs>
  );
}
```

**Step 4: Verify it renders**

```bash
pnpm dev
# Navigate to http://localhost:3000
# Enter 0xdAC17F958D2ee523a2206206994597C13D831ec7 (USDT) on Ethereum
# Should see: contract header with name "TetherToken", tabs with counts
```

**Step 5: Commit**

```bash
git add app/[chain]/ components/contract-header.tsx components/contract/contract-tabs.tsx
git commit -m "feat: add contract dashboard page with header and tab skeleton"
```

---

## Task 9: Read Functions Tab

**Files:**
- Create: `components/contract/function-card.tsx`
- Create: `components/contract/function-list.tsx`
- Modify: `components/contract/contract-tabs.tsx`

**Step 1: Build the function card (interactive, client component)**

Create `components/contract/function-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { AbiFunction } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ChainSlug } from "@/types/contract";

interface FunctionCardProps {
  fn: AbiFunction;
  chain: ChainSlug;
  address: string;
}

export function FunctionCard({ fn, chain, address }: FunctionCardProps) {
  const [inputs, setInputs] = useState<string[]>(
    fn.inputs.map(() => "")
  );
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasInputs = fn.inputs.length > 0;

  async function handleQuery() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/read/${chain}/${address}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionName: fn.name,
          args: inputs,
          abi: [fn],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Query failed");
      }

      setResult(
        typeof data.result === "object"
          ? JSON.stringify(data.result, null, 2)
          : String(data.result)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-mono">{fn.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {fn.stateMutability}
          </Badge>
        </div>
        {fn.outputs.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Returns: {fn.outputs.map((o) => o.type).join(", ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {fn.inputs.map((input, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {input.name || `param${i}`}{" "}
              <span className="font-mono">({input.type})</span>
            </label>
            <Input
              placeholder={input.type}
              value={inputs[i]}
              onChange={(e) => {
                const next = [...inputs];
                next[i] = e.target.value;
                setInputs(next);
              }}
              className="font-mono text-sm"
            />
          </div>
        ))}
        <Button
          onClick={handleQuery}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="w-fit"
        >
          {loading ? "Querying..." : "Query"}
        </Button>
        {result !== null && (
          <pre className="rounded-md bg-muted p-3 font-mono text-sm break-all whitespace-pre-wrap">
            {result}
          </pre>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Build the function list**

Create `components/contract/function-list.tsx`:

```tsx
import type { AbiFunction } from "viem";
import { FunctionCard } from "@/components/contract/function-card";
import type { ChainSlug } from "@/types/contract";

interface FunctionListProps {
  functions: AbiFunction[];
  chain: ChainSlug;
  address: string;
}

export function FunctionList({ functions, chain, address }: FunctionListProps) {
  if (functions.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No read functions found.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {functions.map((fn) => (
        <FunctionCard
          key={fn.name}
          fn={fn}
          chain={chain}
          address={address}
        />
      ))}
    </div>
  );
}
```

**Step 3: Create the read API route for function calls**

Create `app/api/read/[chain]/[address]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { isAddress, decodeFunctionResult, encodeFunctionData } from "viem";
import type { Abi } from "viem";
import { isValidChainSlug } from "@/lib/chains";
import { getPublicClient } from "@/lib/viem-client";
import type { ChainSlug } from "@/types/contract";

interface RouteParams {
  params: Promise<{ chain: string; address: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { chain, address } = await params;

  if (!isValidChainSlug(chain) || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid chain or address" }, { status: 400 });
  }

  const body = await request.json();
  const { functionName, args, abi } = body as {
    functionName: string;
    args: string[];
    abi: Abi;
  };

  try {
    const client = getPublicClient(chain as ChainSlug);

    const result = await client.readContract({
      address: address as `0x${string}`,
      abi,
      functionName,
      args,
    });

    // Handle BigInt serialization
    const serialized = JSON.parse(
      JSON.stringify(result, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({ result: serialized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Read call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Update contract-tabs to use FunctionList**

Update `components/contract/contract-tabs.tsx` — replace the functions TabsContent:

```tsx
"use client";

import type { Abi, AbiEvent, AbiFunction } from "viem";
import type { ChainSlug, ContractSource } from "@/types/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FunctionList } from "@/components/contract/function-list";

interface ContractTabsProps {
  chain: ChainSlug;
  address: string;
  readFunctions: AbiFunction[];
  events: AbiEvent[];
  source: ContractSource;
  abi: Abi;
}

export function ContractTabs({
  chain,
  address,
  readFunctions,
  events,
  source,
}: ContractTabsProps) {
  return (
    <Tabs defaultValue="functions">
      <TabsList>
        <TabsTrigger value="functions">
          Read ({readFunctions.length})
        </TabsTrigger>
        <TabsTrigger value="events">
          Events ({events.length})
        </TabsTrigger>
        <TabsTrigger value="source">
          Source ({Object.keys(source.files).length} files)
        </TabsTrigger>
        <TabsTrigger value="storage">Storage</TabsTrigger>
      </TabsList>
      <TabsContent value="functions">
        <FunctionList
          functions={readFunctions}
          chain={chain}
          address={address}
        />
      </TabsContent>
      <TabsContent value="events">
        <p className="text-muted-foreground">Events will go here.</p>
      </TabsContent>
      <TabsContent value="source">
        <p className="text-muted-foreground">Source code will go here.</p>
      </TabsContent>
      <TabsContent value="storage">
        <p className="text-muted-foreground">Storage layout will go here.</p>
      </TabsContent>
    </Tabs>
  );
}
```

**Step 5: Verify**

```bash
pnpm dev
# Navigate to USDT contract — read functions should render as cards
# Click "Query" on a no-input function like name() — should show "Tether USD"
# Try balanceOf with an address — should show a balance
```

**Step 6: Commit**

```bash
git add components/contract/function-card.tsx components/contract/function-list.tsx components/contract/contract-tabs.tsx app/api/read/
git commit -m "feat: add read functions tab with interactive contract querying"
```

---

## Task 10: Events Tab

**Files:**
- Create: `components/contract/event-list.tsx`
- Modify: `components/contract/contract-tabs.tsx`

**Step 1: Build the event list component**

Create `components/contract/event-list.tsx`:

```tsx
import type { AbiEvent } from "viem";
import { toEventSignature, toEventHash } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventListProps {
  events: AbiEvent[];
}

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No events found.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {events.map((event) => {
        const signature = toEventSignature(event);
        const hash = toEventHash(event);

        return (
          <Card key={event.name}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-mono">
                {event.name}
              </CardTitle>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {signature}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {event.inputs.map((input, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono">{input.type}</span>
                    <span className="text-muted-foreground">
                      {input.name || `param${i}`}
                    </span>
                    {input.indexed && (
                      <Badge variant="outline" className="text-xs">
                        indexed
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-xs text-muted-foreground break-all">
                Topic 0: {hash}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

**Step 2: Update contract-tabs to use EventList**

In `components/contract/contract-tabs.tsx`, add the import and replace the events TabsContent:

```tsx
import { EventList } from "@/components/contract/event-list";
```

Replace the events TabsContent:

```tsx
<TabsContent value="events">
  <EventList events={events} />
</TabsContent>
```

**Step 3: Verify**

```bash
pnpm dev
# Navigate to USDT contract, click Events tab
# Should show Transfer, Approval events with indexed params and topic hashes
```

**Step 4: Commit**

```bash
git add components/contract/event-list.tsx components/contract/contract-tabs.tsx
git commit -m "feat: add events tab with signatures and indexed param display"
```

---

## Task 11: Source Code Tab

**Files:**
- Create: `components/contract/source-viewer.tsx`
- Modify: `components/contract/contract-tabs.tsx`

Note: For syntax highlighting, use a lightweight approach. Install `shiki` for Solidity highlighting:

```bash
pnpm add shiki
```

**Step 1: Build the source viewer**

Create `components/contract/source-viewer.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ContractSource } from "@/types/contract";

interface SourceViewerProps {
  source: ContractSource;
}

export function SourceViewer({ source }: SourceViewerProps) {
  const fileNames = Object.keys(source.files);
  const [activeFile, setActiveFile] = useState(fileNames[0] || "");

  if (fileNames.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No source code available.
      </p>
    );
  }

  const content = source.files[activeFile] || "";

  return (
    <div className="flex flex-col gap-3">
      {fileNames.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b pb-2">
          {fileNames.map((name) => {
            const shortName = name.split("/").pop() || name;
            return (
              <button
                key={name}
                onClick={() => setActiveFile(name)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-mono transition-colors ${
                  activeFile === name
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {shortName}
              </button>
            );
          })}
        </div>
      )}
      <div className="relative">
        <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted p-4 font-mono text-sm leading-relaxed">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
}
```

**Step 2: Update contract-tabs to use SourceViewer**

In `components/contract/contract-tabs.tsx`, add the import:

```tsx
import { SourceViewer } from "@/components/contract/source-viewer";
```

Replace the source TabsContent:

```tsx
<TabsContent value="source">
  <SourceViewer source={source} />
</TabsContent>
```

**Step 3: Verify**

```bash
pnpm dev
# Navigate to USDT contract, click Source tab
# Should show Solidity source code in a code block
# If multi-file, should show file tabs at top
```

**Step 4: Commit**

```bash
git add components/contract/source-viewer.tsx components/contract/contract-tabs.tsx
git commit -m "feat: add source code viewer with multi-file support"
```

---

## Task 12: Storage Layout Tab

**Files:**
- Create: `components/contract/storage-layout.tsx`
- Modify: `components/contract/contract-tabs.tsx`

**Step 1: Build the storage layout component**

Storage layout is available in the compiler metadata for some contracts. Etherscan's `getsourcecode` response sometimes includes it in the `SourceCode` JSON under `settings.outputSelection`. For the MVP, we'll parse what's available and show a fallback when it's not.

Create `components/contract/storage-layout.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StorageEntry {
  slot: string;
  offset: number;
  type: string;
  label: string;
}

interface StorageLayoutProps {
  entries: StorageEntry[];
}

export function StorageLayout({ entries }: StorageLayoutProps) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          Storage layout is not available for this contract.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Storage layout requires compiler metadata with storage output enabled.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Storage Layout</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Slot</th>
                <th className="pb-2 pr-4 font-medium">Offset</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 font-medium">Variable</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono">{entry.slot}</td>
                  <td className="py-2 pr-4 font-mono">{entry.offset}</td>
                  <td className="py-2 pr-4 font-mono">{entry.type}</td>
                  <td className="py-2 font-mono">{entry.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Update contract-tabs to use StorageLayout**

For the MVP, pass an empty array (storage layout parsing from compiler output is complex and can be enhanced later). In `components/contract/contract-tabs.tsx`:

```tsx
import { StorageLayout } from "@/components/contract/storage-layout";
```

Replace the storage TabsContent:

```tsx
<TabsContent value="storage">
  <StorageLayout entries={[]} />
</TabsContent>
```

**Step 3: Verify**

```bash
pnpm dev
# Navigate to any contract, click Storage tab
# Should show "Storage layout is not available" message
```

**Step 4: Commit**

```bash
git add components/contract/storage-layout.tsx components/contract/contract-tabs.tsx
git commit -m "feat: add storage layout tab with fallback for unavailable data"
```

---

## Task 13: Error Handling and Not Found Page

**Files:**
- Create: `app/[chain]/[address]/not-found.tsx`
- Create: `app/not-found.tsx`

**Step 1: Create contract not-found page**

Create `app/[chain]/[address]/not-found.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-bold">Contract Not Found</h2>
      <p className="text-muted-foreground">
        Invalid chain or address. Please check the URL and try again.
      </p>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
```

**Step 2: Create global not-found page**

Create `app/not-found.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/not-found.tsx app/[chain]/[address]/not-found.tsx
git commit -m "feat: add not-found pages for invalid routes and contracts"
```

---

## Task 14: Final Polish and Build Verification

**Step 1: Clean up default Next.js files**

Remove the default Next.js page content/styles that came from scaffolding if any remain (favicon, default CSS, etc.).

**Step 2: Run full lint**

```bash
pnpm lint
```

Fix any issues.

**Step 3: Run full test suite**

```bash
pnpm test
```

All unit tests should pass.

**Step 4: Run production build**

```bash
pnpm build
```

Should complete without errors.

**Step 5: Test production build manually**

```bash
pnpm start
# Open http://localhost:3000
# Test: enter USDT address on Ethereum → see dashboard
# Test: query name() → "Tether USD"
# Test: click Events tab → see Transfer, Approval
# Test: click Source tab → see Solidity code
# Test: click Storage tab → see "not available" message
# Test: enter invalid address → see error
# Test: navigate to /ethereum/0xinvalid → see not found
```

**Step 6: Commit any remaining fixes**

```bash
git add -A
git reset HEAD .claude/ CLAUDE.md
git commit -m "chore: final polish and build verification"
```

---

## Summary

| Task | Description | Key Files |
|---|---|---|
| 1 | Project scaffolding | package.json, vitest.config.ts, shadcn setup |
| 2 | Types + chain config | types/contract.ts, lib/chains.ts |
| 3 | Etherscan API client | lib/etherscan.ts |
| 4 | ABI parsing utilities | lib/abi-utils.ts |
| 5 | Viem client factory | lib/viem-client.ts |
| 6 | API route (Etherscan proxy) | app/api/contract/.../route.ts |
| 7 | Landing page | app/page.tsx, components/address-input.tsx |
| 8 | Contract dashboard page | app/[chain]/[address]/page.tsx |
| 9 | Read functions tab | components/contract/function-card.tsx |
| 10 | Events tab | components/contract/event-list.tsx |
| 11 | Source code tab | components/contract/source-viewer.tsx |
| 12 | Storage layout tab | components/contract/storage-layout.tsx |
| 13 | Error handling | not-found pages |
| 14 | Final polish + build | lint, test, build verification |
