# Phase 4: Best Practices & Standards

**Date**: 2026-02-23
**Scope**: Entire Solidview codebase

---

## Framework & Language Findings

### High

**BP-H1: `NextResponse.json()` Used Where `Response.json()` Suffices**
All 4 API routes import `NextResponse` but only use `NextResponse.json()`. Since none use cookies, redirects, or rewrites, the standard `Response.json()` (Web Fetch API) is sufficient and reduces framework coupling.
*Fix*: Replace `NextResponse.json()` with `Response.json()` and remove the import.

**BP-H2: TypeScript Target Is ES2017 — Should Be ES2022+**
`tsconfig.json` targets ES2017. The runtime is Node 18+ which supports ES2022. This causes unnecessary downleveling for features the runtime already supports (top-level await, Object.hasOwn, Error.cause, etc.).
*Fix*: Update `"target": "ES2022"` in tsconfig.json.

**BP-H3: `vitest.config.ts` Uses CJS `__dirname` Instead of `import.meta.url`**
`__dirname` is a CJS global. While it works due to Vite transpilation, `import.meta.url` is the correct ESM idiom.
*Fix*: Use `path.dirname(fileURLToPath(import.meta.url))` or `new URL(".", import.meta.url).pathname`.

**BP-H4: Unused `@vitejs/plugin-react` Dependency**
Listed in `devDependencies` but never imported or referenced in any config. Pulls in Babel + SWC transforms for zero benefit.
*Fix*: `pnpm remove @vitejs/plugin-react`.

**BP-H5: Validate Route Has Unprotected `request.json()`**
`app/api/keys/validate/route.ts` — No try/catch around `request.json()`, no body size limit. Inconsistent with the read route which was fixed with defensive parsing.
*Fix*: Apply the same `request.text()` + size check + `JSON.parse` pattern used in the read route.

### Medium

**BP-M1: Context Value Memo Has Stale Closure Pattern**
`lib/api-key-context.tsx` — `getKeyForChain` and `hasKeyForChain` are wrapped in `useCallback` with narrow deps, but the `value` memo spreads `...state` and depends on `[state, ...]`, so individual callback memos provide no benefit — they're recreated on every state change anyway.
*Fix*: Either remove `useCallback` wrappers on getter functions, or split state (useReducer / multiple useState) so validation changes don't invalidate key callbacks.

**BP-M2: No `generateMetadata` for Dynamic Contract Pages**
`app/[chain]/[address]/page.tsx` — Every contract page inherits root layout's static metadata "Solidview". No dynamic title/description for SEO, browser tabs, or social sharing.
*Fix*: Export `generateMetadata` with address and chain in title.

**BP-M3: Inline `import()` Type Annotation in `layout.tsx`**
`layout.tsx` uses `import("@/types/contract").ChainSlug` instead of a standard top-level import. The file already has other imports at the top.
*Fix*: Add `import type { ChainSlug } from "@/types/contract"` at the top.

**BP-M4: `as ChainSlug` Assertions Instead of Type Narrowing**
5 locations use `as ChainSlug` after an `isValidChainSlug()` guard. Since the guard is a type predicate (`value is ChainSlug`), the assertion is redundant after the guard. In `chain-selector.tsx`, the `onValueChange` callback genuinely needs a runtime guard.
*Fix*: Remove redundant assertions. Add `isValidChainSlug` guard in chain-selector's `onValueChange`.

**BP-M5: Empty `next.config.ts` Missing Recommended Settings**
Missing `reactStrictMode: true` (React 19 recommendation), `poweredByHeader: false` (security), and security headers.
*Fix*: Add recommended production settings.

**BP-M6: No `AbortSignal.timeout()` on Etherscan Fetch Calls**
`lib/etherscan.ts` — Both `fetch()` calls have no timeout. Slow/hanging Etherscan blocks server-side render indefinitely.
*Fix*: Add `signal: AbortSignal.timeout(10_000)` to both fetch calls.

**BP-M7: Client Fetch Calls Don't Check `response.ok`**
`components/contract-loader.tsx:45` — `.then(res => res.json())` without checking `res.ok`. Non-JSON error responses (Next.js error pages) will throw unhelpful errors.
*Fix*: Check `res.ok` before calling `res.json()`. Same applies to `address-input.tsx`.

**BP-M8: `ChainSlug` Type Could Be Derived from Data**
`types/contract.ts` defines `ChainSlug` as a string literal union, and `lib/chains.ts` defines a matching `Record<ChainSlug, ChainConfig>`. Adding a chain requires updating both.
*Fix*: Use `satisfies` + `keyof typeof chains` to derive the type from the data object.

**BP-M9: `viem-client.ts` Duplicates Chain Mapping**
`viemChains` map duplicates slug-to-chain mapping already in `chains.ts`. Adding a chain requires changes in both files.
*Fix*: Add viem chain object to `ChainConfig` in `chains.ts`, or use viem's `extractChain` utility with `chainId`.

**BP-M10: `useEffect` Data Fetching Without AbortController Cleanup**
`components/contract-loader.tsx`, `components/address-input.tsx` — Fire-and-forget fetch with no abort cleanup. Unmount/navigation during fetch causes wasted requests and potential state updates on unmounted components.
*Fix*: Add `AbortController` with cleanup in useEffect return.

### Low

**BP-L1: `@types/node` Pinned to v20 While Running Node 22+**
`package.json` has `"@types/node": "^20"`. Should match the actual runtime.
*Fix*: Update to `"@types/node": "^22"`.

**BP-L2: Cache Eviction Is FIFO, Not LRU**
`lib/etherscan.ts` — Comment says "LRU cache" but eviction deletes the first-inserted entry, not least-recently-used.
*Fix*: Either re-insert on read for true LRU, or rename comment to "FIFO eviction cache".

**BP-L3: Test Files Import Vitest Globals Redundantly**
All 4 test files import `describe`/`it`/`expect` from vitest, but `vitest.config.ts` has `globals: true`. Imports are redundant (though explicit imports are the recommended practice).
*Fix*: Either remove imports or set `globals: false` for consistency.

**BP-L4: `idle` Validation State Set but Never Rendered**
`api-key-panel.tsx` — `handleChange` sets state to `"idle"` but the rendering logic has no branch for it. Falls through to showing nothing.
*Fix*: Add `Minus` icon for idle (same as empty), or merge idle and empty states.

**BP-L5: `pnpm` Version in `packageManager` Field Is Slightly Dated**
`package.json` pins `pnpm@9.15.4`. Latest 9.x is newer. Minor issue.

### Positive Observations

1. **No `React.FC` or `forwardRef`** — Modern function declarations with `React.ComponentProps<>` (React 19 + shadcn pattern)
2. **`Promise<params>` in route handlers** — Correctly uses Next.js 15+ async params
3. **Unified `radix-ui` package** (v1.4.3) — Not deprecated individual `@radix-ui/*` packages
4. **Tailwind CSS 4 with CSS-first config** — `@import "tailwindcss"`, `@theme inline`, `@custom-variant`
5. **`data-slot` attributes** on all shadcn components
6. **Consistent `import type`** for type-only imports
7. **ESLint 9 flat config** (`eslint.config.mjs`)
8. **Turbopack** for dev (`next dev --turbopack`)
9. **`suppressHydrationWarning`** on `<html>` for next-themes
10. **View Transitions API** with feature detection and `prefers-reduced-motion` respect

---

## CI/CD & DevOps Findings

### Critical

**OPS-C1: No CI/CD Pipeline Exists**
No `.github/workflows/`, no CI config of any kind. No automated gate between push and deploy. No lint, type-check, test, or build verification runs.
*Fix*: Create `.github/workflows/ci.yml` (on PR + push to main: install, lint, type-check, test, build). Add E2E workflow and deploy-on-merge workflow.

**OPS-C2: No Security Headers Configured**
(Same as SEC-M1/BP-M5) Empty `next.config.ts`. No CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, or Permissions-Policy.
*Fix*: Add `headers()` function to next.config.ts.

**OPS-C3: No Rate Limiting on Any API Route**
(Same as SEC-H1) No `middleware.ts`. All 4 routes unprotected. `/api/keys/validate` is especially dangerous — enables API key brute-forcing and Etherscan quota exhaustion.
*Fix*: Create `middleware.ts` with IP-based rate limiting. Stricter limits on validate endpoint.

**OPS-C4: No Deployment Strategy or Configuration**
No `vercel.json`, `Dockerfile`, deployment scripts, or IaC. Deployments are ad-hoc with no blue-green, canary, rollback, or audit trail.
*Fix*: Add deployment config for target platform. Define rollback procedure.

### High

**OPS-H1: No Error Boundaries**
(Same as CQ-H2/SEC-M2) No `error.tsx` at any level. Unhandled errors show opaque default pages.
*Fix*: Add `app/error.tsx` and `app/[chain]/[address]/error.tsx`.

**OPS-H2: No Monitoring, Logging, or Observability**
Zero structured logging, no metrics, no alerting, no health endpoint, no error reporting service. No visibility into errors, response times, cache hit ratios, or API quota usage.
*Fix*: Add `/api/health` endpoint. Integrate Sentry. Add structured logging to API routes.

**OPS-H3: In-Memory Cache Resets on Deploy/Cold Start**
(Related to PERF-C1) Module-level `Map` cache is local to each serverless function instance. On Vercel, effective cache lifetime is minutes, not the configured 24 hours.
*Fix*: Use Vercel KV/Redis, or Next.js `unstable_cache`/`fetch` with `revalidate` for persistent caching.

**OPS-H4: Hardcoded Public RPC URLs with No Fallback**
(Same as PERF-H6) All 5 chains use `llamarpc.com` only. No env var overrides, no retry with alternate provider. Outage = total failure.
*Fix*: Make RPC URLs configurable via env vars. Add viem `fallback()` transport.

**OPS-H5: No Node.js Version Pinning**
No `.nvmrc`, no `.node-version`, no `engines` field. Running Node 23 (unstable/current, not LTS).
*Fix*: Add `.nvmrc` with `22`. Add `"engines": { "node": ">=22" }` to package.json.

**OPS-H6: Dependency Vulnerabilities Not Gated**
`pnpm audit` reports 3 vulnerabilities (1 moderate, 2 high) — all transitive through eslint. No audit step in any pipeline.
*Fix*: Add `pnpm audit --audit-level=high` to CI. Configure Dependabot/Renovate.

### Medium

**OPS-M1: No Prettier Configuration File**
No `.prettierrc` or equivalent. `pnpm format` uses Prettier defaults, which may vary across versions.
*Fix*: Add `.prettierrc.json` with explicit config.

**OPS-M2: No CORS Configuration**
No CORS headers on API routes. No `middleware.ts` for cross-cutting concerns.
*Fix*: Add CORS config to restrict allowed origins.

**OPS-M3: `.env.example` Is Incomplete**
Only lists Etherscan keys with no comments. Missing RPC URL overrides, deployment settings, descriptions.
*Fix*: Expand with comments, descriptions, and links to documentation.

**OPS-M4: Playwright Config Hardcodes Local Browser Path**
`/usr/bin/brave` hardcoded in playwright.config.ts. Fails in any CI without Brave installed.
*Fix*: `process.env.PLAYWRIGHT_BROWSER_PATH || "/usr/bin/brave"`. Use standard Chromium in CI.

**OPS-M5: `passWithNoTests: true` in Vitest Config**
Test suite reports success even when zero tests found. Accidental test deletion goes undetected.
*Fix*: Remove `passWithNoTests: true` once test suite is stable.

### Low

**OPS-L1: No Pre-commit Hooks**
No husky, lint-staged, or lefthook. Developers can commit code that fails linting/formatting.
*Fix*: Add husky + lint-staged.

**OPS-L2: No LICENSE File**
(Same as DOC-M5) CLAUDE.md states MIT but no file exists.
*Fix*: Add LICENSE file.

**OPS-L3: No `--frozen-lockfile` Enforcement**
Without CI enforcing `pnpm install --frozen-lockfile`, lockfile can drift between developers.
*Fix*: Add to CI pipeline.

**OPS-L4: ESLint Config Lacks Custom Rules**
Only extends Next.js defaults. No import ordering, no `no-console` for production code, no hooks exhaustive deps enforcement beyond default.
*Fix*: Add project-specific rules.

---

## Findings Summary

| Severity | Framework & Language | CI/CD & DevOps | Total |
|----------|---------------------|----------------|-------|
| Critical | 0 | 4 | 4 |
| High | 5 | 6 | 11 |
| Medium | 10 | 5 | 15 |
| Low | 5 | 4 | 9 |
| **Total** | **20** | **19** | **39** |

*Note: Several findings overlap with earlier phases (security headers, rate limiting, error boundaries, RPC fallback, cache persistence). These are noted with cross-references.*
