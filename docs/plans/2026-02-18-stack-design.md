# Solidview — Stack & Architecture Design

**Date:** 2026-02-18
**Status:** Approved

## Overview

Solidview is a smart contract explorer/dashboard where users paste any verified contract address and get a human-readable breakdown of its functions, events, storage layout, and can interact with read functions directly. Read-only, stateless, more opinionated and user-friendly than Etherscan's read/write tabs.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components, API routes, single deploy |
| Language | TypeScript | Type safety for ABI parsing, contract types |
| Styling | Tailwind CSS 4 + shadcn/ui | Utility-first + polished dashboard components |
| Ethereum | viem | Lightweight, type-safe, read-only contract calls |
| Data source | Etherscan family APIs | Verified ABIs + source. One pattern for all chains |
| Package manager | pnpm | Fast, strict resolution |
| Linting | ESLint + Prettier | Standard Next.js setup |
| Unit testing | Vitest | Fast, Vite-native, TypeScript-first |
| E2E testing | Playwright | Browser-based end-to-end tests |

## Supported Networks

Ethereum, Arbitrum, Optimism, Base, Polygon — all have Etherscan-compatible APIs.

## Architecture

Monolith Next.js App Router application. Single deployable unit.

- **Server Components** fetch contract data from Etherscan at request time (no client-side loading spinners for initial data)
- **API routes** proxy Etherscan calls, keeping API keys server-side
- **Client Components** only where needed (interactive function input forms, tab switching)
- **No database** — fully stateless, URL-driven state

## Project Structure

```
solidview/
├── app/
│   ├── layout.tsx              # Root layout (fonts, theme, nav)
│   ├── page.tsx                # Landing page — address input + chain selector
│   ├── [chain]/
│   │   └── [address]/
│   │       ├── page.tsx        # Contract dashboard (main view)
│   │       └── loading.tsx     # Skeleton while server component fetches
│   └── api/
│       └── contract/
│           └── [chain]/
│               └── [address]/
│                   └── route.ts  # Proxy to Etherscan API
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── contract/
│   │   ├── function-card.tsx   # Single function display + input form
│   │   ├── function-list.tsx   # Grouped list of read functions
│   │   ├── event-list.tsx      # Contract events display
│   │   ├── storage-layout.tsx  # Storage slot visualization
│   │   └── source-viewer.tsx   # Syntax-highlighted source code
│   ├── address-input.tsx       # Address input with validation
│   ├── chain-selector.tsx      # Network dropdown
│   └── contract-header.tsx     # Contract name, address, chain badge
├── lib/
│   ├── chains.ts               # Chain configs (RPC URLs, explorer APIs, chain IDs)
│   ├── etherscan.ts            # Etherscan API client
│   ├── abi-utils.ts            # ABI parsing, grouping, formatting
│   └── viem-client.ts          # Public client factory per chain
├── types/
│   └── contract.ts             # Shared types
├── .env.local                  # API keys (not committed)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## Routing

URLs follow `/{chain}/{address}` pattern (e.g., `/ethereum/0xdAC1...`). This makes contracts shareable via URL and keeps the app fully stateless.

## Data Flow

1. User pastes address + selects chain on landing page
2. Navigation to `/{chain}/{address}`
3. Server Component fetches ABI + source from Etherscan API
4. `abi-utils.ts` parses and groups functions (read/write/events)
5. Page renders with contract data already in HTML (no loading spinner)
6. Client components handle interactive function calls:
   - User enters params → viem `readContract` → decoded result displayed

### API Key Safety

Etherscan calls happen server-side only. The browser never sees API keys. The API route exists as a fallback for client-side refetching.

### Error Handling

- Invalid address → validation on input form before navigation
- Contract not verified → show "Contract not verified on {chain}"
- Etherscan rate limit → retry with backoff
- No contract at address → viem `getCode()` check → "No contract found"

## MVP Features

### 1. Contract Overview
- Contract name, address (copyable), chain badge
- Compiler version, optimization status, license
- Quick stats: function count, event count

### 2. Read Functions Tab
- Every `view`/`pure` function listed as a card
- No-input functions: auto-queried on page load
- Functions with inputs: typed input fields based on ABI param types
- "Query" button → viem `readContract` → decoded result
- NatSpec descriptions when available

### 3. Events Tab
- Event signatures with parameter names and types
- Indexed vs non-indexed params clearly marked
- Event signature hash displayed
- No historical log fetching — schema/signature reference only

### 4. Source Code Tab
- Syntax-highlighted Solidity source
- Multi-file contracts: file tree with switching
- Read-only viewer

### 5. Storage Layout Tab
- Parsed from compiler metadata when available
- Slot number, variable name, type, offset
- Graceful fallback when metadata unavailable

## Explicitly Out of Scope

- Write functions / wallet connection
- Historical event log querying
- Contract comparison / diffing
- Saved contracts / bookmarks
- Dark/light theme toggle
- Sourcify fallback
- Proxy contract resolution

## Environment Variables

```
ETHERSCAN_API_KEY=...
ARBISCAN_API_KEY=...
OPTIMISM_ETHERSCAN_API_KEY=...
BASESCAN_API_KEY=...
POLYGONSCAN_API_KEY=...
```

## Commands

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server (port 3000) |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Playwright) |

## Deployment

Vercel is the natural fit (zero-config Next.js hosting). The app is a standard Next.js app — works anywhere that runs Node.js.
