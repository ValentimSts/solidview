# Phase 1: Code Quality & Architecture Review

**Date**: 2026-02-23
**Scope**: Entire Solidview codebase (52 files)

---

## Code Quality Findings

### Critical

**CQ-C1: Client-Supplied ABI Accepted Without Validation** (read API route:22-27)
The `/api/read/[chain]/[address]` route accepts an arbitrary ABI via `as` cast with zero runtime validation. A malicious payload could cause unexpected contract calls, server crashes, or DoS via oversized payloads.
*Fix*: Fetch ABI server-side or validate with Zod schema + size limits.

**CQ-C2: API Keys Serialized from Server to Client via Props** (layout.tsx:35-47)
Environment API keys are read in the server layout and passed as props to the `"use client"` Providers component. Next.js serializes these into the HTML payload, exposing server-side keys to all users.
*Fix*: Never pass server env keys as client component props. Use them only in Server Components and API routes.

### High

**CQ-H1: Missing `request.json()` Error Handling** (read route:22, validate route:4)
Both POST routes call `request.json()` without try/catch. Malformed JSON causes unhandled 500 errors.
*Fix*: Wrap in try/catch, return 400 with clear message.

**CQ-H2: No Error Boundary (`error.tsx`)** (missing files)
No `error.tsx` at root or `[chain]/[address]` level. Unhandled server errors show Next.js default blank error page.
*Fix*: Add error boundaries at both levels.

**CQ-H3: Etherscan Response Not Validated for HTTP Errors** (etherscan.ts:33-34, 55-56)
`response.json()` called without checking `response.ok`. Rate-limited or 500 responses produce obscure JSON parse errors.
*Fix*: Check `response.ok` before parsing, throw `EtherscanError` for non-2xx.

**CQ-H4: No Rate Limiting on API Routes** (all API routes)
No rate limiting on any endpoint. Allows quota exhaustion of Etherscan and RPC providers.
*Fix*: Add per-IP rate limiting middleware.

**CQ-H5: `parseSourceCode` Crashes on Malformed Double-Braced JSON** (etherscan.ts:78-99)
`JSON.parse` in multi-file source handling has no try/catch. Truncated Etherscan responses produce generic SyntaxError.
*Fix*: Wrap in try/catch, fall through to single-file handling on failure.

**CQ-H6: `getKeyForChain` Dependency on Entire State Object** (api-key-context.tsx:50-55)
Callback depends on entire `state`, causing reference changes on every state update. Triggers unnecessary re-fetches in `ContractLoader`.
*Fix*: Narrow dependency to `[state.chainOverrides, state.primaryKey]`.

### Medium

**CQ-M1: Swallowed Error in Chain Status Fetch** (address-input.tsx:38)
`.catch(() => {})` silently drops errors. *Fix*: Log with `console.warn`.

**CQ-M2: Contract API Returns 404 for All Errors** (contract route:49)
Network failures and rate limits conflated with "not found". *Fix*: Return 502 for non-Etherscan errors.

**CQ-M3: `ContractLoader` Doesn't Check `response.ok`** (contract-loader.tsx:44-46)
Non-OK responses may not have `.error` field, leading to corrupt data in success path. *Fix*: Check `res.ok` first.

**CQ-M4: `StorageLayout` Always Receives Empty Array** (contract-tabs.tsx:52)
Tab visible but permanently empty. Dead code masquerading as feature. *Fix*: Hide tab or mark "Coming Soon".

**CQ-M5: Context Provider Value Creates New Object Every Render** (api-key-context.tsx:78)
`{ ...state, ... }` creates new reference each render, causing all consumers to re-render. *Fix*: Wrap in `useMemo`.

**CQ-M6: No Abort Controller for Fetch Calls** (contract-loader.tsx:30-63, address-input.tsx:34-39)
Missing `AbortController` allows wasted network requests and potential race conditions on unmount/navigation. *Fix*: Add abort controllers with cleanup.

**CQ-M7: Missing Input Validation for `args` in Read API** (read route:23-27)
`functionName` and `args` not validated for type/presence. *Fix*: Add explicit type checks, return 400.

**CQ-M8: Hardcoded `.sol` Extension** (etherscan.ts:96-99)
Single-file contracts always get `.sol`. Vyper contracts mislabeled. *Fix*: Detect language from compiler version.

**CQ-M9: `addRecentSearch` No localStorage Error Handling** (recent-searches.ts:22-32)
`localStorage.setItem` can throw (quota exceeded, private browsing). *Fix*: Add try/catch.

**CQ-M10: `idle` Validation State Renders Nothing** (api-key-panel.tsx:146-158)
The `"idle"` state shows no icon, creating blank indicator area. *Fix*: Show `Minus` icon for idle too.

**CQ-M11: `chainStatus` Endpoint Returns Same Boolean for All Chains** (chains status route:6-13)
Only checks global key, ignores chain-specific overrides. *Fix*: Check per-chain env vars too.

### Low

**CQ-L1: Unnecessary `as` Type Assertions** (5 locations)
Several casts could be eliminated via proper type narrowing after `isValidChainSlug` guard.

**CQ-L2: Duplicated Error UI Pattern** (page.tsx:41-53, contract-loader.tsx:78-84)
Error display duplicated between server and client paths. *Fix*: Extract `ErrorCard` component.

**CQ-L3: Duplicated Container Wrapper** (5 locations)
`mx-auto max-w-5xl p-8` repeated 5 times. *Fix*: Extract `PageContainer`.

**CQ-L4: `getAllChains()` Called at Module Level in Multiple Files** (3 files)
Minor inconsistency; acceptable for small chain list.

**CQ-L5: `viemChains` Map Duplicates Chain Slug Knowledge** (viem-client.ts:6-12)
Adding a chain requires updating both `chains.ts` and `viem-client.ts`. *Fix*: Single source of truth.

**CQ-L6: `ContractHeader` Doesn't Link to Block Explorer** (contract-header.tsx:22-30)
Address displayed but not clickable. `explorerUrl` available but unused. *Fix*: Make address an external link.

**CQ-L7: No CORS Headers on API Routes** (all routes)
Fine for same-origin SPA, but worth noting for future.

**CQ-L8: `envKeyMap` Inconsistent with Chain Status** (layout.tsx:23-28)
Layout pre-fills chain-specific keys but status endpoint doesn't reflect their availability.

**CQ-L9: `NavHeader` Missing Home Link** (nav-header.tsx)
No logo/title linking to home page. Users can't navigate back from contract page easily.

---

## Architecture Findings

### Critical

**AR-C1: Client-Supplied ABI in Read Route** (same as CQ-C1)
The server trusts client entirely for ABI data. Single most significant architectural vulnerability.
*Fix*: Server-side ABI fetch/validation, or verify function signature against server-fetched ABI.

**AR-C2: Server API Keys Leaked to Client** (same as CQ-C2)
Etherscan API keys embedded in client HTML via RSC serialization. Exposes quota to all users.
*Fix*: Use keys only in Server Components and API routes.

### High

**AR-H1: No Request Body Validation Framework** (all API routes)
No Zod or equivalent. Routes use `as` casts or manual `typeof` checks. Zod is already a transitive dependency.
*Fix*: Adopt Zod for all request validation.

### Medium

**AR-M1: Dual Rendering Path Creates Duplicated Layout** (page.tsx:26-77, contract-loader.tsx:89-108)
Server and client paths render identical layouts with no shared abstraction. Error rendering also duplicated.
*Fix*: Extract `ContractDashboard` presentational component.

**AR-M2: Inconsistent Error Response Shapes** (all API routes)
`/api/contract` returns `{ error }`, `/api/keys/validate` returns `{ valid, error }`, `/api/chains/status` never errors. No shared error type.
*Fix*: Define standard error response type and `apiError()` utility.

**AR-M3: No Caching Layer for Etherscan Responses** (etherscan.ts, contract route)
Every page load triggers fresh Etherscan API calls. ABIs/source are effectively immutable once verified.
*Fix*: Use Next.js `revalidate`, `unstable_cache`, or LRU cache with long TTL.

**AR-M4: Chain Config Tightly Coupled to Hardcoded RPC URLs** (chains.ts)
RPC URLs hardcoded to `llamarpc.com`. No env var overrides or fallback providers.
*Fix*: Allow `ETHEREUM_RPC_URL` env overrides, consider fallback chains.

**AR-M5: Stale Closure Risk in `getKeyForChain`** (api-key-context.tsx:50-55)
`useCallback` depends on entire `state`, defeating memoization. Effect in `ContractLoader` re-runs on every keystroke.
*Fix*: Granular dependencies or restructure context.

**AR-M6: `ContractLoader` Fetches on Every Render When Key Changes** (contract-loader.tsx:30-63)
No AbortController. Unstable `getKeyForChain` reference triggers redundant API calls.
*Fix*: Stabilize dependency, add AbortController.

**AR-M7: No Rate Limiting** (same as CQ-H4)
Denial of service risk via API route abuse.

### Low

**AR-L1: `StorageLayout` Is a Placeholder** (storage-layout.tsx, contract-tabs.tsx:52)
Tab always shows "Storage layout is not available." Confusing UX.
*Fix*: Hide tab or add "Coming Soon" badge.

**AR-L2: Missing Response Types for API Contracts** (types/contract.ts)
No TypeScript types for API request/response payloads. Client code uses untyped JSON.
*Fix*: Define `ContractResponse`, `ReadCallResponse`, etc.

**AR-L3: `ParsedAbi` Interface in `lib/` Instead of `types/`** (abi-utils.ts:3-7)
Breaks convention established by rest of codebase. *Fix*: Move to `types/contract.ts`.

**AR-L4: Etherscan URL Duplicated** (etherscan.ts, validate route)
Base URL `https://api.etherscan.io/v2/api` appears in two files. *Fix*: Export from `etherscan.ts`.

**AR-L5: Hardcoded Solidity Language** (etherscan.ts:93-99)
Vyper contracts mislabeled. *Fix*: Detect from compiler version.

**AR-L6: Source Viewer Has No Virtualization** (source-viewer.tsx)
Large contracts may cause rendering performance issues. Acceptable for now but risk increases with syntax highlighting.

**AR-L7: No `Suspense` Boundaries for Streaming** (page.tsx)
Async Server Component fetches all data before rendering. Suspense boundaries would enable streaming.

**AR-L8: No Component Tests** (zero files)
No React component tests. Critical components like `AddressInput`, `ContractLoader`, `FunctionCard` untested.

**AR-L9: E2E Tests Cover Only Theme Toggle** (e2e/theme-toggle.spec.ts)
Core user journey (enter address, load contract) has no E2E coverage.

---

## Positive Observations

1. **Clean layer separation**: types -> lib -> components -> app, no circular dependencies
2. **Strong TypeScript**: Well-defined interfaces, `ChainSlug` union type, shared type vocabulary
3. **Small focused components**: Largest custom component under 250 lines
4. **Good accessibility**: Proper ARIA attributes, keyboard nav, `prefers-reduced-motion` check
5. **Parallel data fetching**: `Promise.all` correctly used for ABI + source
6. **Custom error class**: `EtherscanError` enables differentiated handling
7. **Client caching**: viem-client cache prevents duplicate RPC clients
8. **Lean dependency tree**: 7 production deps, all justified, no bloat
9. **Modern APIs**: View Transitions for theme, oklch color space
10. **Good foundation for growth**: Adding chains is a 3-file change

---

## Critical Issues for Phase 2 Context

The following findings should specifically inform the Security and Performance reviews:

### Security-Critical
- **ABI injection**: Read API accepts arbitrary client ABI (CQ-C1/AR-C1)
- **Secret exposure**: Server API keys leaked to client HTML (CQ-C2/AR-C2)
- **No input validation**: Multiple routes lack validation (CQ-H1, CQ-M7, AR-H1)
- **No rate limiting**: All routes unprotected (CQ-H4/AR-M7)

### Performance-Critical
- **No caching**: Fresh Etherscan calls every page load (AR-M3)
- **Excessive re-renders**: Unstable context value causes cascade (CQ-H6, CQ-M5, AR-M5)
- **No abort controllers**: Wasted network requests (CQ-M6/AR-M6)
- **No streaming**: Full page blocks on all data (AR-L7)
- **Hardcoded RPC**: No fallback for provider outages (AR-M4)

---

## Findings Summary

| Severity | Code Quality | Architecture | Total |
|----------|-------------|--------------|-------|
| Critical | 2 | 2 | 4 (2 unique) |
| High | 6 | 1 | 7 (6 unique) |
| Medium | 11 | 7 | 18 (13 unique) |
| Low | 9 | 9 | 18 (14 unique) |
| **Total** | **28** | **19** | **47 (35 unique)** |

*Note: Several findings overlap between Quality and Architecture reviews (CQ-C1=AR-C1, CQ-C2=AR-C2, CQ-H4=AR-M7, etc.)*
