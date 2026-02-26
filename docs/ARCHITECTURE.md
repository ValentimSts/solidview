# Solidview — Architecture Overview

Solidview is a read-only, stateless smart contract explorer. Users paste a verified Ethereum contract address, select a chain, and receive a human-readable breakdown of its ABI, events, source code, and compiler metadata. Read-only (`view`/`pure`) functions can be called directly from the UI.

---

## Table of Contents

1. [Layer Architecture](#1-layer-architecture)
2. [Data Flow](#2-data-flow)
3. [Caching Strategy](#3-caching-strategy)
4. [Authentication — API Key Resolution](#4-authentication--api-key-resolution)
5. [Key Design Decisions](#5-key-design-decisions)
6. [Module Reference](#6-module-reference)

---

## 1. Layer Architecture

Solidview is organized into four horizontal layers. Each layer has a single responsibility and communicates only with the layer directly beneath it.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│                                                                 │
│  app/page.tsx          app/[chain]/[address]/page.tsx           │
│  (landing — address    (contract dashboard — Server Component   │
│   input + chain        with client-side ContractLoader fallback)│
│   selector)                                                     │
│                                                                 │
│  components/                                                    │
│    contract-loader.tsx   contract/contract-tabs.tsx             │
│    contract-header.tsx   contract/function-list.tsx             │
│    api-key-panel.tsx     contract/function-card.tsx             │
│    nav-header.tsx        contract/event-list.tsx    (lazy)      │
│    address-input.tsx     contract/source-viewer.tsx (lazy)      │
│    chain-selector.tsx    contract/storage-layout.tsx(lazy)      │
│    recent-searches.tsx                                          │
│                    shadcn/ui primitives (Tailwind CSS 4)        │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP (fetch / Next.js Route Handlers)
┌───────────────────────────▼─────────────────────────────────────┐
│                         API LAYER                               │
│                                                                 │
│  GET  /api/contract/[chain]/[address]   — Etherscan proxy       │
│  POST /api/read/[chain]/[address]       — on-chain read calls   │
│  GET  /api/chains/status               — server key discovery   │
│  POST /api/keys/validate               — API key validation     │
│                                                                 │
│  proxy.ts  — IP-based rate limiter (30 req / 60 s)              │
└───────────────────────────┬─────────────────────────────────────┘
                            │  function calls (same process)
┌───────────────────────────▼─────────────────────────────────────┐
│                        DOMAIN LAYER                             │
│                                                                 │
│  lib/chains.ts         — chain registry (slug → chainId, URLs)  │
│  lib/etherscan.ts      — Etherscan V2 client + 2-level cache    │
│  lib/abi-utils.ts      — ABI parsing and categorization         │
│  lib/abi-validation.ts — read-only ABI item validator           │
│  lib/viem-client.ts    — viem PublicClient factory (per-chain)  │
│  lib/api-key-context.tsx — React Context for client API keys    │
│  lib/recent-searches.ts — localStorage recent search history    │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTPS (network I/O)
┌───────────────────────────▼─────────────────────────────────────┐
│                     EXTERNAL SERVICES                           │
│                                                                 │
│  Etherscan V2 API  api.etherscan.io/v2/api                      │
│    — ABI (getabi)                                               │
│    — Source code + compiler metadata (getsourcecode)            │
│    — Key validation (stats/ethsupply probe)                     │
│                                                                 │
│  EVM RPC nodes  (public LlamaRPC endpoints or custom overrides) │
│    — Ethereum  https://eth.llamarpc.com                         │
│    — Arbitrum  https://arbitrum.llamarpc.com                    │
│    — Optimism  https://optimism.llamarpc.com                    │
│    — Base      https://base.llamarpc.com                        │
│    — Polygon   https://polygon.llamarpc.com                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow

### 2.1 Primary Flow — Contract Dashboard

The sequence below covers the path taken when a user navigates to a contract for the first time on a deployment that has `ETHERSCAN_API_KEY` configured on the server.

```
Browser                     Next.js Server                 External
──────────                  ──────────────                 ────────
  │                               │                            │
  │  User types address + chain   │                            │
  │  on landing page (/)          │                            │
  │                               │                            │
  │  navigate → /<chain>/<address>│                            │
  │──────────────────────────────►│                            │
  │                               │                            │
  │                     generateMetadata()                     │
  │                     fetchContractSource() ─────────────────►
  │                               │            Etherscan V2   │
  │                               │◄─────────────────────────-│
  │                               │  {name, compilerVersion…} │
  │                               │                            │
  │                     ContractPage (Server Component)        │
  │                     fetchContractAbi()   ──────────────────►
  │                     fetchContractSource()──────────────────►
  │                               │◄───────────────────────────│
  │                               │  {abi, metadata, source}  │
  │                               │                            │
  │                     parseContractAbi(abi)                  │
  │                       → readFunctions[]                    │
  │                       → writeFunctions[]                   │
  │                       → events[]                           │
  │                               │                            │
  │◄──────────────────────────────│                            │
  │   HTML (ContractHeader +      │                            │
  │   Suspense + ContractTabs)    │                            │
  │                               │                            │
  │  User clicks "Events" tab     │                            │
  │  next/dynamic loads EventList │                            │
  │   (lazy JS chunk)             │                            │
  │                               │                            │
  │  User clicks "Query" on a     │                            │
  │  read function                │                            │
  │                               │                            │
  │  POST /api/read/<chain>/<addr>│                            │
  │  { functionName, args, abi }  │                            │
  │──────────────────────────────►│                            │
  │                               │  client.readContract()─────►
  │                               │                   EVM RPC │
  │                               │◄───────────────────────────│
  │◄──────────────────────────────│                            │
  │  { result: "…" }              │                            │
```

### 2.2 Client-Side Fallback Flow

When `ETHERSCAN_API_KEY` is not set on the server, `ContractPage` renders `<ContractLoader>` instead of fetching directly. `ContractLoader` is a Client Component that reads the user's API key from `ApiKeyContext` and calls the Etherscan proxy route. The fetch has a 15-second timeout and is aborted when dependencies change (e.g. API key update) to prevent stale responses from overwriting newer ones.

```
Browser                         Next.js Server              Etherscan
──────────                      ──────────────              ─────────
  │                                   │                         │
  │  navigate → /<chain>/<address>    │                         │
  │──────────────────────────────────►│                         │
  │                                   │                         │
  │                         No ETHERSCAN_API_KEY                │
  │                         → render <ContractLoader />         │
  │◄──────────────────────────────────│                         │
  │  (HTML: loading spinner)          │                         │
  │                                   │                         │
  │  useEffect: read ApiKeyContext     │                         │
  │  GET /api/contract/<chain>/<addr> │                         │
  │  x-api-key: <user-key>            │                         │
  │──────────────────────────────────►│                         │
  │                                   │  fetchContractAbi()────►│
  │                                   │  fetchContractSource()─►│
  │                                   │◄────────────────────────│
  │◄──────────────────────────────────│                         │
  │  { abi, metadata, source }        │                         │
  │                                   │                         │
  │  parseContractAbi() → render UI   │                         │
```

### 2.3 `generateMetadata` Deduplication

`generateMetadata` and `ContractPage` both call `fetchContractSource`. Because the server uses the L1 in-memory cache and Next.js deduplicates `fetch` calls within a single render pass (via the Next.js request memoization layer), Etherscan is contacted only once per page render, not twice.

---

## 3. Caching Strategy

Etherscan data is immutable for a given contract address: once verified, the ABI and source code never change. Solidview exploits this with a two-level cache.

### 3.1 Cache Levels

```
Request for (chainId, address)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  L1 — In-Memory LRU (lib/etherscan.ts)                │
│                                                       │
│  Map<string, CacheEntry>                              │
│  Key: "<chainId>:<address>:<action>"                  │
│  Max entries: 500 (FIFO eviction)                     │
│  TTL: 24 hours                                        │
│  Scope: single Node.js process                        │
└───────────────┬───────────────────────────────────────┘
                │ miss
                ▼
┌───────────────────────────────────────────────────────┐
│  L2 — Next.js Data Cache (unstable_cache)             │
│                                                       │
│  Key: ["etherscan-abi"|"etherscan-source",            │
│         chainId, address]                             │
│  Revalidate: 86 400 s (24 hours)                      │
│  Scope: persists across server restarts and deploys   │
└───────────────┬───────────────────────────────────────┘
                │ miss
                ▼
        Etherscan V2 API fetch
```

### 3.2 Custom API Key Bypass

When a request arrives with a user-supplied API key (via the `x-api-key` header), L2 is intentionally skipped. The user's key has its own Etherscan rate-limit bucket that should not be conflated with the server's shared bucket, and the response must not be stored under a shared cache entry.

```typescript
// lib/etherscan.ts — fetchContractAbi()
if (apiKey) {
  // Custom API key -- skip L2, fetch directly
  abi = await fetchAbiRaw(chainId, address, apiKey);
} else {
  // L2: persistent Next.js Data Cache
  abi = await getCachedAbiFetcher(chainId, address)();
}
// Always populate L1 on success
setInCache(cacheKey, abi);
```

### 3.3 HTTP Response Cache Headers

The Etherscan proxy route (`GET /api/contract/[chain]/[address]`) sets explicit cache headers so CDN edges and browsers can cache contract data without hitting the server:

```
Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800
```

| Directive | Value | Meaning |
|---|---|---|
| `max-age` | 3 600 s (1 h) | Browser cache lifetime |
| `s-maxage` | 86 400 s (24 h) | CDN/proxy cache lifetime |
| `stale-while-revalidate` | 604 800 s (7 d) | Serve stale while revalidating in background |

### 3.4 Cache Invalidation

- `clearEtherscanCache()` (exported from `lib/etherscan.ts`) clears L1 only. It is exposed primarily for unit tests.
- L2 can be invalidated per-entry using Next.js `revalidateTag`. No tags are assigned in the current implementation; L2 entries expire naturally after 24 hours.

---

## 4. Authentication — API Key Resolution

Solidview needs an Etherscan API key to fetch contract data. The key can come from three sources, resolved in the following priority order.

### 4.1 Resolution Order

```
┌─────────────────────────────────────────────────────────────────┐
│  Priority 1 — Client x-api-key header                          │
│  User enters key in ApiKeyPanel → stored in ApiKeyContext       │
│  → sent as x-api-key header on ContractLoader fetch            │
│  → forwarded to Etherscan by the proxy route                    │
│  Bypasses L2 cache (user-specific rate limit)                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ not present
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Priority 2 — ETHERSCAN_API_KEY env var                         │
│  Set at deployment time (server-side only)                      │
│  Used by ContractPage (Server Component) directly               │
│  Used by the proxy route as fallback when no header             │
│  Shared across all users — goes through L1+L2 cache            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ not present
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Priority 3 — No key                                            │
│  Server Component skips direct fetch, renders ContractLoader    │
│  ContractLoader shows "No API key configured" error             │
│  if ApiKeyContext also has no key                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Per-Chain RPC Override

EVM read calls use viem's `PublicClient`. The transport is resolved per chain:

```
RPC_URL_<CHAIN> env var set?
        │
        ├── Yes → fallback([http(envRpcUrl), http(chainConfig.rpcUrl)])
        │
        └── No  → http(chainConfig.rpcUrl)   (LlamaRPC public endpoint)
```

`<CHAIN>` is the uppercase chain slug: `ETHEREUM`, `ARBITRUM`, `OPTIMISM`, `BASE`, `POLYGON`.

### 4.3 API Key Validation

The `ApiKeyPanel` component validates keys before they are used by calling `POST /api/keys/validate`. The validation endpoint probes the Etherscan V2 API with a lightweight `stats/ethsupply` call and returns `{ valid: true }` or `{ valid: false, error: "..." }`. Key input fields debounce validation by 600 ms; validation state (`empty | idle | validating | valid | invalid`) is stored in `ApiKeyContext` keyed by a `fieldKey` string so that each input field retains its own state independently.

### 4.4 Server Key Discovery

On mount, `NavHeader` calls `GET /api/chains/status` to check whether the server has `ETHERSCAN_API_KEY` configured. The response is a `Record<ChainSlug, boolean>` that tells `ApiKeyContext` whether each chain already has server-side coverage. This prevents unnecessary "no API key" errors when the server key is available.

---

## 5. Key Design Decisions

### 5.1 Stateless Server

Solidview has no database and no server-side sessions. All contract data is fetched from Etherscan on demand and cached in memory. This makes the server horizontally scalable and removes all state management complexity. The trade-off is that L1 cache is per-process: multiple server instances do not share the in-memory cache, so cold starts will miss L1 but hit L2.

### 5.2 Etherscan V2 Unified Endpoint

All Etherscan calls go to `https://api.etherscan.io/v2/api` with a `chainid` query parameter rather than chain-specific subdomains (e.g. `api-optimistic.etherscan.io`). This means a single API key works across all supported chains, simplifying both the server configuration and the user-facing key panel.

### 5.3 Server Component with Client-Side Fallback

`app/[chain]/[address]/page.tsx` is an async Server Component. This enables:

- **SEO**: the contract name appears in the `<title>` tag, generated by `generateMetadata`.
- **Performance**: the full contract payload is rendered server-side and streamed as HTML, with no client-side waterfall.

When `ETHERSCAN_API_KEY` is absent from the server environment, the page returns `<ContractLoader>` — a Client Component that performs the same fetch from the browser using the user's own API key. The UI is functionally identical in both paths.

### 5.4 viem for RPC Calls

Read calls are routed through `viem`'s `readContract`, which:

- Validates the ABI fragment before making the RPC call.
- Encodes call data and decodes the response using the ABI.
- Returns typed values (bigints, addresses, tuples) that are serialized to JSON via a custom replacer (`bigint → string`).

The `validateAbiItem` guard in `lib/abi-validation.ts` enforces that only `view`/`pure` functions with bounded input/output arrays can be submitted to the read endpoint, preventing malformed or malicious ABI payloads from reaching viem.

### 5.5 Dynamic Imports for Tab Content

`ContractTabs` statically imports `FunctionList` (the default tab) and dynamically imports the remaining three tabs:

```typescript
// components/contract/contract-tabs.tsx
const EventList    = dynamic(() => import("@/components/contract/event-list")...);
const SourceViewer = dynamic(() => import("@/components/contract/source-viewer")...);
const StorageLayout= dynamic(() => import("@/components/contract/storage-layout")...);
```

This defers loading of `highlight.js` (source viewer syntax highlighting) and other heavy dependencies until the user navigates to the relevant tab, keeping the initial JavaScript bundle small.

### 5.6 Read-Only by Design

Solidview does not implement wallet connectivity or transaction signing. Write functions (those with `stateMutability` of `nonpayable` or `payable`) are listed in the ABI breakdown but marked as non-callable. The `validateAbiItem` guard on the read endpoint enforces this server-side, so even a crafted request cannot trigger a state-mutating call.

### 5.7 Rate Limiting

`proxy.ts` applies an in-memory sliding-window rate limiter to all `/api/*` routes: 30 requests per 60-second window per IP. The rate limiter uses the same per-process `Map` pattern as the Etherscan cache; it is not shared across instances. Responses that exceed the limit receive HTTP 429 with a `Retry-After` header.

---

## 6. Module Reference

### `lib/chains.ts`

Chain registry. Exports `getChainConfig(slug)`, `getAllChains()`, and `isValidChainSlug(value)`.

| Chain | Slug | Chain ID | Explorer |
|---|---|---|---|
| Ethereum | `ethereum` | 1 | etherscan.io |
| Arbitrum | `arbitrum` | 42161 | arbiscan.io |
| Optimism | `optimism` | 10 | optimistic.etherscan.io |
| Base | `base` | 8453 | basescan.org |
| Polygon | `polygon` | 137 | polygonscan.com |

### `lib/etherscan.ts`

Etherscan V2 API client. Public API: `fetchContractAbi(chainId, address, apiKey?)`, `fetchContractSource(chainId, address, apiKey?)`, `clearEtherscanCache()`, and the `EtherscanError` class.

Source code parsing handles both single-file contracts and multi-file Standard JSON input (the double-brace `{{…}}` format returned by Etherscan for complex projects). Language detection (`detectLanguage()`) inspects the `CompilerVersion` field to distinguish Solidity from Vyper contracts; Vyper single-file sources use `.vy` extension instead of `.sol`. The parsed `ContractSource` type holds a `files: Record<string, string>` map from file path to source content.

### `lib/abi-utils.ts`

ABI parser. `parseContractAbi(abi)` returns a `ParsedAbi` with three alphabetically sorted arrays: `readFunctions`, `writeFunctions`, and `events`. Categorization is based on `stateMutability`: `view` and `pure` are read; everything else is write.

### `lib/abi-validation.ts`

Read-only ABI item validator used by `POST /api/read/[chain]/[address]`. Validates that an incoming ABI item is a `function` type, has `view` or `pure` state mutability, and has at most 20 inputs and 20 outputs. Returns an error message string or `null`.

### `lib/viem-client.ts`

viem `PublicClient` factory. Clients are cached per chain slug in a module-level `Map`. Transport is `http(envRpcUrl)` → `http(chainConfig.rpcUrl)` fallback if `RPC_URL_<CHAIN>` is set, otherwise a single `http(chainConfig.rpcUrl)`.

### `lib/api-key-context.tsx`

React Context for client-side API key state. `ApiKeyProvider` holds a primary Etherscan key, per-chain override keys, and validation state per field key. `useApiKeys()` exposes `getKeyForChain(chain)`, `hasKeyForChain(chain)`, and `setValidation(fieldKey, state, error?)`.

### `lib/recent-searches.ts`

`localStorage` utility. `addRecentSearch(address, chain)` prepends a search entry and caps the list at 5 entries. `getRecentSearches()` reads and parses the list, returning `[]` on the server or on parse failure.

### API Routes

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/contract/[chain]/[address]` | GET | Etherscan proxy (ABI + source) | `x-api-key` header or `ETHERSCAN_API_KEY` env |
| `/api/read/[chain]/[address]` | POST | On-chain read call via viem | None (public RPC) |
| `/api/chains/status` | GET | Server key availability per chain | None |
| `/api/keys/validate` | POST | Validate user-supplied Etherscan key | None |

For full request/response schemas see [`docs/API.md`](./API.md).
