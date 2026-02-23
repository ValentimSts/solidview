# Solidview

Explore, understand, and interact with any verified Ethereum smart contract.

<!-- ![Solidview](./assets/screenshot.png) -->

Solidview is a read-only, stateless smart contract explorer. Paste a verified contract address, select a chain, and get a human-readable breakdown of functions, events, storage layout, and query read functions directly.

## Prerequisites

- Node.js 22+
- pnpm

## Quick Start

```bash
git clone git@github.com:ValentimSts/solidview.git
cd solidview
pnpm install
```

Create a `.env.local` file with your Etherscan API key:

```
ETHERSCAN_API_KEY=your_api_key_here
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supported Networks

| Network   | Chain ID | Explorer API         |
| --------- | -------- | -------------------- |
| Ethereum  | 1        | Etherscan            |
| Arbitrum  | 42161    | Arbiscan             |
| Optimism  | 10       | Optimism Etherscan   |
| Base      | 8453     | Basescan             |
| Polygon   | 137      | Polygonscan          |

## Commands

| Command         | Description                    |
| --------------- | ------------------------------ |
| `pnpm dev`      | Start development server       |
| `pnpm build`    | Production build               |
| `pnpm start`    | Run production build locally   |
| `pnpm lint`     | Run ESLint                     |
| `pnpm format`   | Run Prettier                   |
| `pnpm test`     | Run unit tests (Vitest)        |
| `pnpm test:e2e` | Run E2E tests (Playwright)     |

## Tech Stack

| Layer       | Choice                    |
| ----------- | ------------------------- |
| Framework   | Next.js 16 (App Router)   |
| Language    | TypeScript                |
| Styling     | Tailwind CSS 4 + shadcn/ui |
| Ethereum    | viem                      |
| Data source | Etherscan V2 API          |
| Testing     | Vitest + Playwright       |

## Architecture

The project is organized in four layers:

- **types/** -- Shared TypeScript types and interfaces for chains, contracts, and metadata.
- **lib/** -- Core utilities for chain configuration, Etherscan API integration, ABI parsing, and viem client management. This layer has no React dependencies.
- **components/** -- React components split between reusable UI primitives (shadcn/ui) and domain-specific contract components (function cards, event lists, source viewer).
- **app/** -- Next.js App Router pages and API routes. Server components handle initial data fetching, with client components for interactive features like read function calls and API key management.

## Documentation

- [API Reference](docs/API.md) — endpoint documentation for all 4 API routes
- [Architecture](docs/ARCHITECTURE.md) — system overview, data flow, caching, key decisions
- [Security](docs/SECURITY.md) — security headers, rate limiting, input validation, key handling

## Contributing

Contributions are welcome. Open an issue to discuss what you would like to change, then submit a pull request.

## License

[MIT](LICENSE)
