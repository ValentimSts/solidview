# Review Scope

## Target

Entire Solidview codebase — a read-only, stateless Ethereum smart contract explorer built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, and viem.

## Files

### App Layer (10 files)
- `app/layout.tsx` — Root layout (fonts, theme, nav)
- `app/page.tsx` — Landing page (address input + chain selector)
- `app/not-found.tsx` — Global 404
- `app/[chain]/[address]/page.tsx` — Contract dashboard
- `app/[chain]/[address]/loading.tsx` — Loading skeleton
- `app/[chain]/[address]/not-found.tsx` — Contract 404
- `app/api/contract/[chain]/[address]/route.ts` — Etherscan proxy
- `app/api/read/[chain]/[address]/route.ts` — Contract read calls via viem
- `app/api/chains/status/route.ts` — Chain API key availability
- `app/api/keys/validate/route.ts` — API key validation

### Components (24 files)
- Custom: `address-input.tsx`, `api-key-panel.tsx`, `chain-selector.tsx`, `contract-header.tsx`, `contract-loader.tsx`, `nav-header.tsx`, `providers.tsx`, `recent-searches.tsx`, `theme-toggle.tsx`
- Contract: `contract-tabs.tsx`, `event-list.tsx`, `function-card.tsx`, `function-list.tsx`, `source-viewer.tsx`, `storage-layout.tsx`
- UI (shadcn): `alert-dialog.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `collapsible.tsx`, `input.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `tabs.tsx`, `tooltip.tsx`

### Libraries (7 files)
- `lib/abi-utils.ts` — ABI parsing, grouping, formatting
- `lib/api-key-context.tsx` — React Context for API keys + validation
- `lib/chains.ts` — Chain configs (5 networks)
- `lib/etherscan.ts` — Etherscan V2 API client
- `lib/recent-searches.ts` — localStorage utility
- `lib/utils.ts` — Utility functions
- `lib/viem-client.ts` — Public client factory per chain

### Types (1 file)
- `types/contract.ts` — Shared types (ChainSlug, ChainConfig, ContractMetadata, ContractSource)

### Tests (5 files)
- `__tests__/lib/abi-utils.test.ts`
- `__tests__/lib/chains.test.ts`
- `__tests__/lib/etherscan.test.ts`
- `__tests__/lib/viem-client.test.ts`
- `e2e/theme-toggle.spec.ts`

### Config (5 files)
- `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `playwright.config.ts`

## Flags

- Security Focus: no
- Performance Critical: no
- Strict Mode: no
- Framework: Next.js 16 (App Router)

## Review Phases

1. Code Quality & Architecture
2. Security & Performance
3. Testing & Documentation
4. Best Practices & Standards
5. Consolidated Report
