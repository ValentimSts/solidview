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

