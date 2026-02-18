# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Next.js 16 project scaffolding with TypeScript and App Router.
- Tailwind CSS 4 with PostCSS configuration.
- shadcn/ui component library with button, card, input, tabs, badge, and separator components.
- viem for Ethereum interactions.
- Vitest for unit testing.
- Prettier for code formatting.
- ESLint configuration via eslint-config-next.
- Environment variable template (`.env.example`) for blockchain explorer API keys.
- Project directory structure (`app/`, `components/`, `lib/`, `types/`, `__tests__/`).
- Shared TypeScript types for contracts, chains, and ABI structures (`types/contract.ts`).
- Chain configuration for Ethereum, Arbitrum, Optimism, Base, and Polygon (`lib/chains.ts`).
- Unit tests for chain configuration utilities (`__tests__/lib/chains.test.ts`).
- Etherscan API client for fetching verified contract ABIs and source code (`lib/etherscan.ts`).
- Unit tests for Etherscan API client (`__tests__/lib/etherscan.test.ts`).
- ABI parsing utilities to categorize functions (read/write) and events (`lib/abi-utils.ts`).
- Unit tests for ABI parsing utilities (`__tests__/lib/abi-utils.test.ts`).
- Viem public client factory with per-chain caching (`lib/viem-client.ts`).
- Unit tests for viem public client factory (`__tests__/lib/viem-client.test.ts`).
- Landing page with address input and chain selector (`app/page.tsx`, `components/address-input.tsx`, `components/chain-selector.tsx`).
- Contract dashboard page with dynamic `[chain]/[address]` routing (`app/[chain]/[address]/page.tsx`).
- Loading skeleton for the contract dashboard page (`app/[chain]/[address]/loading.tsx`).
- Contract header component displaying name, chain, compiler info, and function counts (`components/contract-header.tsx`).
- Contract tabs stub with Read, Events, Source, and Storage tabs (`components/contract/contract-tabs.tsx`).
- Read functions tab with interactive contract querying (`components/contract/function-card.tsx`, `components/contract/function-list.tsx`).
- Read API route for executing contract read calls via viem (`app/api/read/[chain]/[address]/route.ts`).
- Events tab displaying event signatures, indexed parameters, and topic hashes (`components/contract/event-list.tsx`).

