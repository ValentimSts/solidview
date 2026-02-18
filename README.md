# Solidview

Explore, understand, and interact with any verified Ethereum smart contract.

Solidview is a read-only smart contract explorer that gives you a human-readable breakdown of any verified contract's functions, events, storage layout, and lets you query read functions directly. Paste an address, pick a chain, and start exploring.

## Supported Networks

- Ethereum
- Arbitrum
- Optimism
- Base
- Polygon

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Ethereum:** viem
- **Data Source:** Etherscan family APIs
- **Testing:** Vitest + Playwright

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v9+)

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
ETHERSCAN_API_KEY=your_key_here
ARBISCAN_API_KEY=your_key_here
OPTIMISM_ETHERSCAN_API_KEY=your_key_here
BASESCAN_API_KEY=your_key_here
POLYGONSCAN_API_KEY=your_key_here
```

You can get free API keys from:
- [Etherscan](https://etherscan.io/apis)
- [Arbiscan](https://arbiscan.io/apis)
- [OP Etherscan](https://optimistic.etherscan.io/apis)
- [Basescan](https://basescan.org/apis)
- [Polygonscan](https://polygonscan.com/apis)

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
pnpm start
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

### Linting & Formatting

```bash
pnpm lint
pnpm format
```

## License

[MIT](LICENSE)
