# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-02-26

### Fixed

- Vyper contracts now correctly detected and displayed with `.vy` extension instead of `.sol`.
- Non-string Etherscan error results no longer produce `[object Object]` messages.
- `parseInt` for compiler optimization runs now defaults to `0` on `NaN`.
- Race condition in contract loader when API key changes mid-fetch.
- Contract loader fetch now has a 15-second timeout to prevent indefinite loading.
- Shiki highlighter singleton resets on initialization failure, allowing retry.
- Storage layout tab now shows "coming soon" instead of misleading metadata error.

### Changed

- Migrated `middleware.ts` to `proxy.ts` per Next.js 16 convention.
- Updated API and architecture docs to reflect Vyper contract support and `detectLanguage()` helper.
- Added server-side error logging to contract proxy and read API routes.
- Chain status fetch no longer silently swallows errors.

### Added

- Back-to-home navigation button in nav bar, visible only on contract pages.
- Lazy-loaded tab content (EventList, SourceViewer, StorageLayout) with `next/dynamic` for smaller initial bundle.
- `generateMetadata` for contract pages — dynamic title/description with contract name and chain.
- Suspense boundary around contract tabs with skeleton fallback.
- Two-level caching for Etherscan data: in-memory LRU (L1) + persistent Next.js Data Cache via `unstable_cache` (L2).
- Line numbers in source code viewer with gutter column.
- Large file truncation in source viewer — files over 1000 lines show "Show all N lines" expand button.
- JSDoc documentation for all exported lib functions, types, and constants.
- API endpoint documentation (`docs/API.md`).
- Architecture overview documentation (`docs/ARCHITECTURE.md`).
- Security documentation (`docs/SECURITY.md`).
- Documentation section in README linking to all docs.
- Example contract addresses in README (USDC, WETH, Curve stETH/ETH, Uniswap V3).
- Syntax highlighting in source code viewer using shiki (`github-light`/`github-dark` themes, Solidity + Vyper support).
- Nonce-based `Content-Security-Policy` header with per-request nonce generation, WASM support for shiki, and restrictive default policy.

## [0.1.0] - 2026-02-23

### Added

- API key panel with persistent validation, per-chain overrides, and environment variable pre-fill.
- Diagonal sweep theme transition with orange accent palette.
- Recently searched contracts section with localStorage persistence.
- Client-provided API keys wired to contract fetching.
- Dark mode support with light/system/dark toggle.
- Persistent navigation header.
- Chain availability status indicators.
- Etherscan V2 unified API migration.
- Contract dashboard with tabbed interface for read functions, events, and source code.
- Function cards with input forms for querying read functions.
- Address input with validation and chain selector.
- ABI parsing and categorization utilities.
- Syntax-highlighted source code viewer.
- Loading skeletons and not-found page.
- Support for Ethereum, Arbitrum, Optimism, Base, and Polygon networks.

### Fixed

- Critical security and performance issues.
- Sheet accessibility warning.
- React key warnings and dead code removal.
