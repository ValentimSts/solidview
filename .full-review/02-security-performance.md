# Phase 2: Security & Performance Review

**Date**: 2026-02-23
**Scope**: Entire Solidview codebase

---

## Security Findings

### Critical

**SEC-C1: Server API Keys Exposed in Client HTML** (CVSS 9.1, CWE-200)
`app/layout.tsx:35-47` — Server env keys (`ETHERSCAN_API_KEY` + 4 chain-specific) passed as props to `"use client"` Providers component. Next.js serializes them into HTML/RSC payload. Every visitor can extract keys from page source. Live key confirmed in `.env.local`.
*Attack*: View source, extract keys, use for unlimited Etherscan API access.
*Fix*: Never pass server secrets to client components. Use keys only in API routes (which already have fallback logic). Rotate exposed key immediately.

**SEC-C2: Arbitrary Client-Supplied ABI Enables Unintended Contract Calls** (CVSS 8.6, CWE-20/502)
`app/api/read/[chain]/[address]/route.ts:22-37` — ABI, functionName, args accepted from client body via `as` cast. Zero runtime validation.
*Attack*: Fabricated ABI with different function selector causes call to unintended functions via `eth_call`. Oversized ABI causes DoS via memory exhaustion.
*Fix*: Validate ABI with Zod schema (enforce `stateMutability: "view"|"pure"`, max 1 item, max 20 inputs). Ideally fetch canonical ABI server-side.

### High

**SEC-H1: No Rate Limiting on Any API Route** (CVSS 7.5, CWE-770)
All 4 API routes unprotected. Allows Etherscan key exhaustion, RPC abuse, API key brute-force via validate endpoint.
*Fix*: In-memory or Redis-backed rate limiter per IP.

**SEC-H2: No Request Body Validation** (CVSS 7.3, CWE-20)
Read route uses `as` cast. Validate route has minimal `typeof` checks only. No Zod schemas.
*Fix*: Add Zod validation to all POST routes. Zod is already a transitive dep via viem.

**SEC-H3: Missing HTTP Response Status Check on Etherscan Calls** (CVSS 6.5, CWE-252)
`lib/etherscan.ts:33-34, 55-56`, `app/api/keys/validate/route.ts:28-29` — No `response.ok` check before `.json()`. HTML error pages cause `SyntaxError`.
*Fix*: Check `response.ok`, throw `EtherscanError` for non-2xx.

**SEC-H4: User API Key Forwarded to Etherscan Without Sanitization** (CVSS 6.8, CWE-20)
`app/api/contract/[chain]/[address]/route.ts:27-28` — `x-api-key` header passed directly as URL param. No format validation. Server acts as key validation oracle.
*Fix*: Regex validate key format (`/^[A-Z0-9]{20,40}$/i`) before forwarding.

**SEC-H5: Unbounded JSON Parsing on Request Body** (CVSS 6.5, CWE-400)
Both POST routes call `request.json()` with no body size limit. Multi-GB payload causes OOM.
*Fix*: Read `request.text()` first, enforce 10KB limit, then `JSON.parse`.

### Medium

**SEC-M1: No Security Headers Configured** (CVSS 5.3, CWE-693)
Empty `next.config.ts`. Missing CSP, X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy.
*Fix*: Add security headers in `next.config.ts` `headers()`.

**SEC-M2: No Error Boundary** (CVSS 5.0, CWE-209)
No `error.tsx` anywhere. Default Next.js error page in production. Dev mode shows stack traces.
*Fix*: Add `error.tsx` at root and `[chain]/[address]` levels.

**SEC-M3: Error Messages Leak Internal Details** (CVSS 5.3, CWE-209)
Contract and read routes return raw `error.message` which can include RPC URLs, IP addresses, viem internals.
*Fix*: Map internal errors to generic messages. Log details server-side.

**SEC-M4: API Key Input Uses `type="text"`** (CVSS 4.3, CWE-549)
`api-key-panel.tsx:139` — Keys visible in plaintext. Shoulder-surfing, screen sharing, browser autofill risk.
*Fix*: Use `type="password"` with `autoComplete="off"`.

**SEC-M5: localStorage Data Not Validated on Read** (CVSS 3.7, CWE-20)
`lib/recent-searches.ts:14-16` — Parsed JSON not validated for structure. Malicious localStorage modifications create unexpected navigation paths via `<Link>`.
*Fix*: Validate parsed structure with `isAddress()` and `isValidChainSlug()`.

### Low

**SEC-L1: User Input Reflected in Error Response** (CVSS 3.1, CWE-116)
Chain slug reflected in `Unsupported chain: ${chain}`. Low XSS risk (JSON response) but violates defense-in-depth.
*Fix*: Return generic "Unsupported chain" without echoing input.

**SEC-L2: No CSRF Protection on POST Endpoints** (CVSS 3.1, CWE-352)
No origin validation or custom header requirement. Read endpoint usable as cross-origin RPC proxy.
*Fix*: Require `x-requested-with` header or validate origin.

**SEC-L3: No Next.js Middleware** (CVSS 3.3, CWE-693)
No `middleware.ts` for centralized rate limiting, bot detection, request logging.
*Fix*: Create middleware for cross-cutting security concerns.

### Informational

**SEC-I1: Live API Key Needs Rotation** — Key in `.env.local` exposed via C1. Must rotate after fix.
**SEC-I2: No Audit/Request Logging** (CWE-778) — Zero logging anywhere. No incident response capability.
**SEC-I3: Hardcoded Public RPC URLs** — No SLA, may rate-limit. Consider configurable private RPCs.

### OWASP Top 10 Assessment

| Category | Status | Key Findings |
|----------|--------|-------------|
| A01: Broken Access Control | Minor gap | L-02 (no CSRF) |
| A02: Cryptographic Failures | **FAIL** | C-01 (key exposure) |
| A03: Injection | **FAIL** | C-02 (untrusted ABI) |
| A04: Insecure Design | **FAIL** | H-01 (no rate limit) |
| A05: Security Misconfiguration | **FAIL** | M-01 (no headers) |
| A06: Vulnerable Components | PASS | All deps current |
| A07: Auth Failures | N/A | No auth system |
| A08: Data Integrity Failures | **FAIL** | H-02, H-05 (no validation) |
| A09: Logging Failures | **FAIL** | I-02 (no logging) |
| A10: SSRF | Minor gap | H-04 (key forwarding) |

### Positive Security Practices
- TypeScript strict mode enabled
- `isAddress()` validation consistent at both layers
- Chain slug validated via `isValidChainSlug()`
- No unsafe HTML injection patterns (all rendering via React JSX auto-escaping)
- No unsafe dynamic code execution patterns in application code
- `.env*` properly gitignored
- External links use `rel="noopener noreferrer"`
- URL construction uses `URL` + `searchParams.set()` (proper encoding)
- Read-only architecture (no transactions)

---

## Performance Findings

### Critical

**PERF-C1: No Server-Side Caching for Etherscan API**
`lib/etherscan.ts`, `app/[chain]/[address]/page.tsx`, `app/api/contract/[chain]/[address]/route.ts`
Every page load makes 2 fresh Etherscan calls (ABI + source) for data that is **immutable** once verified. Wastes rate limit (5 calls/sec free tier), adds 500-2000ms latency.
*Fix*: Use Next.js `fetch` with `{ next: { revalidate: 86400 } }` or in-memory LRU cache keyed by `chainId:address`.

**PERF-C2: Context Provider Value Instability**
`lib/api-key-context.tsx:77-78` — `{ ...state, ... }` creates new object reference every render. No `useMemo`. Every state change re-renders the **entire component tree** including `ContractLoader`, `ApiKeyPanel`, and all `KeyField` instances.
*Fix*: Wrap in `useMemo`. Consider splitting into dispatch context and state context.

### High

**PERF-H1: `getKeyForChain` Depends on Full State** (same as CQ-H6)
`api-key-context.tsx:50-55` — `[state]` dependency means every validation state change triggers contract re-fetch. Typing API key triggers multiple redundant fetches.
*Fix*: Narrow to `[state.chainOverrides, state.primaryKey]`.

**PERF-H2: No Code Splitting / Lazy Loading**
`components/contract/contract-tabs.tsx:6-9` — All tab content imported eagerly. SourceViewer, EventList loaded even when on "Read" tab. Build: 220KB main chunk.
*Fix*: Use `next/dynamic` for tab content components. Est. 100-150KB deferred.

**PERF-H3: Source Viewer Has No Virtualization**
`components/contract/source-viewer.tsx` — Entire file rendered in single `<pre>`. Large contracts (3000+ lines) cause jank on paint/scroll.
*Fix*: Use `@tanstack/react-virtual` for visible-line-only rendering.

**PERF-H4: No AbortController on Client Fetches**
`components/contract-loader.tsx:30-63`, `components/address-input.tsx:34-39` — No cancellation on unmount/navigation. Wasted requests, race conditions on rapid nav.
*Fix*: Add AbortController with cleanup in useEffect return.

**PERF-H5: No Fetch Timeout on Etherscan Calls**
`lib/etherscan.ts:33, 55` — No timeout. Slow/unresponsive Etherscan hangs entire page render indefinitely.
*Fix*: `AbortSignal.timeout(10000)`.

**PERF-H6: Hardcoded RPC URLs with No Fallback**
`lib/chains.ts`, `lib/viem-client.ts` — All 5 chains use llamarpc.com only. Outage means all read calls fail.
*Fix*: Use viem's `fallback()` transport with multiple providers.

**PERF-H7: Server Component Blocks Entire Page on Fetch**
`app/[chain]/[address]/page.tsx` — Awaits `Promise.all` before any JSX. No Suspense boundaries. User sees skeleton until ALL data arrives.
*Fix*: Split into Suspense boundaries for header vs tabs content.

**PERF-H8: No HTTP Cache Headers on API Responses**
`app/api/contract/[chain]/[address]/route.ts` — No `Cache-Control` headers. Browser/CDN caches unused for immutable data.
*Fix*: Add `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`.

### Medium

**PERF-M1: Validation Debounce Race Condition**
`components/api-key-panel.tsx:45-75` — No AbortController per validation. Concurrent validation calls can produce stale state overwrites.
*Fix*: Add AbortController per call, cancel previous on new trigger.

**PERF-M2: Large Source Code Payloads Serialized in Full**
Complex contracts (20+ files, 100s of KB) fully serialized in RSC/JSON. User only views one file at a time.
*Fix*: Consider on-demand per-file loading via separate endpoint.

**PERF-M3: Event Signatures Computed Every Render**
`components/contract/event-list.tsx:22-23` — `toEventSignature`/`toEventHash` in `.map()` loop. Keccak256 recomputed each render.
*Fix*: Pre-compute at data load time or memo.

**PERF-M4: Source Code in React State** (client path)
`components/contract-loader.tsx` — Full source (100s of KB) held in React fiber tree. Combined with no caching, every navigation re-fetches and re-stores.
*Fix*: Mitigated by server caching. Consider SWR/React Query for client cache.

**PERF-M5: Single Shared Etherscan API Key**
Server path uses one key for all concurrent users. 2 calls/page = ~2.5 pages/sec max before rate limit.
*Fix*: Caching reduces impact. Support multiple rotating keys for heavy traffic.

**PERF-M6: Empty next.config.ts**
Missing `experimental.optimizePackageImports` for `lucide-react` and `viem`. Missing `poweredByHeader: false`.
*Fix*: Configure optimizations.

**PERF-M7: No Fetch Timeout on Key Validation**
`app/api/keys/validate/route.ts:28` — Slow validation hangs spinner indefinitely.
*Fix*: `AbortSignal.timeout(10000)`.

### Low

**PERF-L1: BigInt Double-Serialization**
`app/api/read/[chain]/[address]/route.ts:39-43` — `JSON.parse(JSON.stringify(...))` for BigInt. Creates full string copy then re-parses.
*Fix*: Direct recursive serializer.

**PERF-L2: Chain Status Fetched Every Home Page Load**
Static for server lifetime. *Fix*: Add `Cache-Control: max-age=300` or inline via Server Component.

**PERF-L3: No Preconnect Hints**
`app/layout.tsx` — No `<link rel="preconnect">` for Etherscan API or llamarpc.com. Saves 100-300ms on first request.

**PERF-L4: FunctionCard Array Copy on Input Change**
Standard React pattern, negligible for 1-5 params.

### Top 10 Priority Fixes (by impact/effort)

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | `useMemo` on context provider value | 15 min | Eliminates cascading re-renders |
| 2 | Etherscan response caching | 30 min | 500-2000ms/page saved |
| 3 | AbortController on client fetches | 20 min | Prevents wasted requests + races |
| 4 | Fetch timeouts | 5 min | Prevents indefinite hangs |
| 5 | Lazy-load tab content | 15 min | ~100-150KB deferred |
| 6 | viem fallback transports | 15 min | Eliminates RPC SPOF |
| 7 | Rate limiting | 30 min | Prevents abuse |
| 8 | error.tsx boundary | 10 min | Graceful error recovery |
| 9 | Virtualize source viewer | 45 min | Eliminates jank for large files |
| 10 | Cache-Control headers | 5 min | Enables browser/CDN caching |

*Items 1-6 alone yield estimated **60-70% reduction in average page load time** (2+ sec to 600-800ms for cached contracts).*

---

## Critical Issues for Phase 3 Context

### Testing Implications
- **All security findings need test coverage**: ABI injection, key exposure, rate limit bypass, body size limits, HTTP error handling
- **Performance regressions need benchmarks**: Cache hit/miss times, re-render counts, bundle size budgets
- **Race conditions need concurrency tests**: AbortController behavior, validation debounce, rapid navigation
- **Error boundaries need integration tests**: Etherscan failure scenarios, malformed responses, network timeouts

### Documentation Implications
- **API security model**: Document trust boundaries, input validation requirements, rate limit policies
- **Deployment security checklist**: Key rotation, security headers, middleware setup
- **Performance guidelines**: Caching strategy, bundle size budgets, virtualization thresholds

---

## Findings Summary

| Severity | Security | Performance | Total |
|----------|----------|-------------|-------|
| Critical | 2 | 2 | 4 |
| High | 5 | 8 | 13 |
| Medium | 5 | 7 | 12 |
| Low | 3 | 4 | 7 |
| Info | 3 | 0 | 3 |
| **Total** | **18** | **21** | **39** |
