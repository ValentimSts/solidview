# Phase 3: Testing & Documentation Review

**Date**: 2026-02-23
**Scope**: Entire Solidview codebase

---

## Test Coverage Findings

**Current state**: 18 unit tests (4 files) + 7 E2E tests (1 file), all passing. Effective functional coverage: ~12-15%.

### Critical

**TEST-C1: API Routes Have Zero Test Coverage**
All 4 API route handlers — the entire server-side security surface — have no tests. The `read` route's `validateAbiItem` function (primary injection-prevention mechanism) is untested. The `contract` route's key forwarding, the `validate` route's input handling, and the `chains/status` response shape are all unverified.
*Fix*: Add integration tests for all 4 routes using fetch mocks. Priority: read route validation (body size, ABI structure, stateMutability), contract route (key forwarding, error propagation), validate route (input shape, Etherscan error handling).

**TEST-C2: LRU Cache Behavior Is Completely Untested**
`lib/etherscan.ts` — The newly added cache (500 entries, 24h TTL) has zero tests for cache hit, TTL expiry, eviction, or case-normalized keys. Tests call `clearEtherscanCache()` in `beforeEach` but never verify caching.
*Fix*: Add tests for second-call cache hit (no re-fetch), TTL expiry with `vi.useFakeTimers()`, eviction at capacity, and case-insensitive address normalization.

**TEST-C3: HTTP Error Handling in Etherscan Client Is Untested**
`lib/etherscan.ts` — Existing tests only mock `response.ok: true`. No coverage for HTTP 429/503 responses, HTML error pages causing JSON parse failures, malformed Etherscan responses, missing `ETHERSCAN_API_KEY`, or double-brace source with invalid JSON.
*Fix*: Add tests for non-OK responses, missing API key branch, malformed source JSON fallback.

### High

**TEST-H1: `validateAbiItem` Is Untestable in Isolation**
`app/api/read/[chain]/[address]/route.ts` — The security guard function is embedded in the route file and cannot be imported for unit testing.
*Fix*: Extract to `lib/abi-validation.ts` and add dedicated tests for all 7 validation branches.

**TEST-H2: `recent-searches.ts` Has No Tests**
Entire module untested: deduplication (case-insensitive), max-entries cap (5), SSR guard, corrupt localStorage handling.
*Fix*: Add tests using `@vitest-environment happy-dom` or localStorage mock.

**TEST-H3: `ApiKeyProvider` Context Logic Has No Tests**
`lib/api-key-context.tsx` — `getKeyForChain` priority (override > primary > undefined), `hasKeyForChain` server-key fallback, validation state round-trips, `useMemo` stability, and `useApiKeys()` outside-provider error are all untested.
*Fix*: Add tests using `@testing-library/react` `renderHook`.

**TEST-H4: Contract Route Error Propagation Untested**
`app/api/contract/[chain]/[address]/route.ts` — No tests verify that `EtherscanError` messages are forwarded, non-Error throws produce fallback strings, or that `x-api-key` header is forwarded to Etherscan calls.

**TEST-H5: Missing Edge Cases in `abi-utils` Tests**
`lib/abi-utils.ts` — `payable` function classification, events-only ABI, `error`/`fallback`/`receive` type handling, overloaded function names, and alphabetical sort verification are untested.

**TEST-H6: `viem-client` Cache Untested**
`lib/viem-client.ts` — No test verifies that repeated calls return the same `PublicClient` instance (reference equality). Module-level cache is shared across tests without cleanup.

### Medium

**TEST-M1: No E2E Tests for Landing Page Workflow**
The primary user journey (enter address, select chain, navigate to contract page) has zero E2E coverage. Address validation, chain selector, recent-searches, and offline-chain alert dialog are untested.
*Fix*: Add `e2e/address-input.spec.ts` covering empty submission, invalid address, error clearing, and valid navigation.

**TEST-M2: No E2E Tests for API Key Panel**
The sheet open/close, key entry, validation state transitions, per-chain collapsible expansion, and server-key indicator have no E2E tests.

**TEST-M3: No E2E Tests for 404 Routes**
Both `app/not-found.tsx` and `app/[chain]/[address]/not-found.tsx` are untested.

**TEST-M4: `parseSourceCode` Edge Cases Untested**
Double-brace with invalid inner JSON (unhandled `SyntaxError`), single-brace standard JSON format, and empty `SourceCode` string.

**TEST-M5: Test Environment Blocks Component Testing**
`vitest.config.ts` uses `environment: "node"`. No `@testing-library/react`, `jsdom`, or `happy-dom` installed. Component unit tests are currently impossible.
*Fix*: Install `@testing-library/react`, `happy-dom`, `@testing-library/user-event`. Add `environmentMatchGlobs` to vitest config.

**TEST-M6: Error Message Content in `chains.ts` Untested**
`getChainConfig("solana")` test verifies throw but not message content. Error includes raw slug value — needs regression gate.

**TEST-M7: No Coverage Reporting Configured**
`vitest.config.ts` has no `coverage` block. No way to measure or enforce coverage thresholds.
*Fix*: Add v8 coverage provider with initial thresholds (~60% statements).

### Low

**TEST-L1: `utils.ts` (`cn` function) Has No Tests**
Pass-through wrapper with no custom logic. Low value but a single test would protect against dependency downgrade.

**TEST-L2: `getAllChains` Return Order Untested**
`Object.values()` order is insertion-order in V8 but implicitly relied upon for UI rendering. Should be explicitly asserted.

**TEST-L3: E2E Tests Use Magic Numbers**
`e2e/theme-toggle.spec.ts` — `PADDING`, `BUTTON_SIZE`, `GAP` constants duplicated from component source. Maintenance risk.

**TEST-L4: Playwright Config Missing Diagnostics**
No `screenshot: "only-on-failure"`, no `video: "retain-on-failure"`. Flaky tests produce no diagnostic artifacts.

### Test Pyramid Analysis

| Layer | Current | Target | Gap |
|-------|---------|--------|-----|
| Unit (pure logic) | 18 tests / 4 files | ~80 tests / 12 files | 62 missing |
| Integration (routes, context, hooks) | 0 | ~40 tests / 6 files | 40 missing |
| E2E (user journeys) | 7 tests / 1 file | ~25 tests / 4 files | 18 missing |
| **Total** | **25** | **~145** | **~120 missing** |

### Coverage Map

| File | Coverage | Critical Gaps |
|------|----------|---------------|
| `lib/abi-utils.ts` | ~75% | payable, error/fallback/receive, sort |
| `lib/chains.ts` | ~85% | Return order, error message |
| `lib/etherscan.ts` | ~40% | Cache, HTTP errors, missing key, malformed JSON |
| `lib/viem-client.ts` | ~60% | Cache hit reference equality |
| `lib/recent-searches.ts` | 0% | Entire module |
| `lib/api-key-context.tsx` | 0% | Entire module |
| `lib/utils.ts` | 0% | Entire module |
| All 4 API routes | 0% | Entire surface |
| All 24 components | 0% | Everything |

---

## Documentation Findings

**Current state**: No README.md, no CHANGELOG.md, no LICENSE file, no API docs, no architecture docs. Single JSDoc comment in the entire codebase (`clearEtherscanCache`).

### Critical

**DOC-C1: No README.md**
The repository has no README. A visitor to the GitHub repo sees nothing — no description, setup instructions, screenshots, or usage guide.
*Fix*: Create comprehensive README with project description, screenshot, prerequisites, quick start, env vars, supported networks, commands, tech stack, architecture overview, contributing guidelines, license.

**DOC-C2: No CHANGELOG.md**
`CLAUDE.md` specifies Keep a Changelog format, yet no CHANGELOG exists. Git history shows 5+ feature commits, none documented. `package.json` shows version `0.1.0` with no corresponding entry.
*Fix*: Create CHANGELOG with `[Unreleased]` and `[0.1.0]` sections documenting the initial feature set.

**DOC-C3: No API Endpoint Documentation**
4 API routes with no JSDoc comments, no request/response schema docs, no example payloads, no error response documentation. The read endpoint's complex validation model (body size limits, ABI structure, stateMutability) is entirely undocumented.
*Fix*: Add JSDoc to each route handler with endpoint description, parameters, body schema, response schema, and examples.

### High

**DOC-H1: No Security Documentation**
Non-trivial security model (client API keys via header, server key fallback, ABI validation, body size limits) is entirely undocumented. Trust boundaries between client, server, and Etherscan are implicit.
*Fix*: Create `SECURITY.md` or README section covering trust model, read-only enforcement, validation constraints, known gaps, and responsible disclosure.

**DOC-H2: No Deployment Documentation**
No docs on deploying to Vercel or any platform. Required vs. optional env vars, behavior without keys, caching limitations (in-memory, lost on cold start), and missing security headers are undocumented.
*Fix*: Add deployment section to README.

**DOC-H3: `.env.example` Has No Descriptions**
5 env var names with no comments. Developers don't know which are required, where to get keys, that `ETHERSCAN_API_KEY` is the primary fallback for all chains, or that the app works without any keys if users provide their own.
*Fix*: Add inline comments to `.env.example` with descriptions and links.

**DOC-H4: No Architecture Documentation**
Clean layered architecture (types -> lib -> components -> app) with two rendering paths is entirely undocumented. Key decisions: dual rendering strategy, Etherscan V2 unified endpoint, in-memory cache, provider hierarchy.
*Fix*: Add architecture section to README or `docs/architecture.md`.

### Medium

**DOC-M1: No Inline Documentation on Library Functions**
7 lib files, 1 JSDoc comment total. Key functions like `fetchContractAbi`, `fetchContractSource`, `parseContractAbi`, `getPublicClient`, `getKeyForChain` all lack documentation.
*Fix*: Add JSDoc to all exported functions with purpose, params, return types, side effects, and edge cases.

**DOC-M2: Type Definitions Lack Documentation**
`types/contract.ts` — `ChainSlug`, `ChainConfig`, `ContractMetadata`, `ContractSource` have no JSDoc. Properties like `explorerUrl` (linking, not API), `rpcUrl` (LlamaRPC), `files` (key format), `language` (hardcoded "Solidity") are ambiguous.

**DOC-M3: Component Props Undocumented**
9 custom components define props interfaces with no JSDoc. `KeyFieldProps.fieldKey` convention (`"primary"` | `"chain-<slug>"`), `ContractLoader` dual-path rendering, `ContractTabs` placeholder tab are non-obvious.

**DOC-M4: StorageLayout Stub Not Documented**
`contract-tabs.tsx:52` renders `StorageLayout` with `entries={[]}`. Always shows "not available." Known placeholder with no TODO comment or user-facing documentation.
*Fix*: Add TODO comment and document as known limitation.

**DOC-M5: No LICENSE File**
`CLAUDE.md` states MIT license but no `LICENSE` file exists. `package.json` has no `license` field.
*Fix*: Add `LICENSE` file with MIT text and `"license": "MIT"` to package.json.

**DOC-M6: Test Documentation Missing**
No docs on how to run tests, coverage gaps, or E2E requirements (Brave browser, dev server).
*Fix*: Add Testing section to README.

### Low

**DOC-L1: `parseSourceCode` Double-Brace Convention Unexplained**
`etherscan.ts:132-149` — Etherscan's non-standard `{{...}}` wrapping for multi-file source has no explanatory comment.

**DOC-L2: Cache Constants Lack Rationale**
`etherscan.ts` — Comment says "LRU cache" but eviction is FIFO. No rationale for 500 entries or 24h TTL.

**DOC-L3: `idle` Validation State Undocumented**
`api-key-context.tsx:6` — 5 validation states with no comments explaining their purpose or transitions.

**DOC-L4: CSS Custom Animations Lack Comments**
`globals.css` — `shake`, `theme-sweep`, and View Transition styles have no explanatory comments.

**DOC-L5: CLAUDE.md Project Structure Slightly Outdated**
References `tailwind.config.ts` (doesn't exist in Tailwind v4) and omits several existing files. Informational only since CLAUDE.md is excluded from commits.

**DOC-L6: `next.config.ts` Empty With No Explanation**
Placeholder comment only. No indication of what is intentionally unconfigured.

---

## Findings Summary

| Severity | Testing | Documentation | Total |
|----------|---------|---------------|-------|
| Critical | 3 | 3 | 6 |
| High | 6 | 4 | 10 |
| Medium | 7 | 6 | 13 |
| Low | 4 | 6 | 10 |
| **Total** | **20** | **19** | **39** |
