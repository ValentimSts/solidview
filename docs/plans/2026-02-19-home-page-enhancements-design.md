# Home Page Enhancements Design

## Overview

Four new features for the Solidview home page: API key side panel, home navigation button, dark mode toggle, and recently searched history. All features live in a new persistent header/nav bar.

## 1. API Key Side Panel

### Trigger

A `Key` icon button in the top-left of the header. Opens a shadcn/ui `Sheet` (slide-in from left).

### Panel Layout

- **Primary key field** at top: "Etherscan API Key" — single input covering all chains.
- **Per-chain overrides** below, collapsed by default (shadcn/ui `Collapsible`): one row per chain (label + input). If empty, the primary key is used.

### Key Display

Pasted keys display truncated like iOS file names: `4J1GKK...H1TAW` (first 6 + `...` + last 5 chars). Full key stored in state.

### Validation Flow

1. User pastes/types key → small spinner appears right of input.
2. API call to new endpoint `/api/keys/validate` tests the key against Etherscan V2 with the relevant chain ID.
3. **Success:** Spinner replaced with green checkmark.
4. **Failure:** Input shakes (CSS animation), then a red error message slides down below the field (`max-height` transition). When the user starts typing again, the error slides back up (reverse animation). Components below reclaim the space.

### State Management

Keys stored in React Context (`ApiKeyProvider`), not persisted. The contract page and API routes can use client-provided keys. Context shape:

```ts
interface ApiKeyContext {
  primaryKey: string;
  chainOverrides: Partial<Record<ChainSlug, string>>;
  getKeyForChain: (chain: ChainSlug) => string | undefined;
}
```

## 2. Home Button

The app name "Solidview" in the header is a `<Link href="/">` — clickable from any page to return home. No separate icon needed; the logo/name serves as the home link.

## 3. Dark Mode Toggle

### Approach

`next-themes` with shadcn/ui's `ThemeProvider`.

### Implementation

- Add `next-themes` dependency.
- Wrap children in `ThemeProvider` in `app/layout.tsx` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- Add `suppressHydrationWarning` to `<html>`.
- Sun/moon toggle button in top-right of header. Cycles: system → light → dark → system.
- `next-themes` handles persistence via cookies (no flash of wrong theme).

## 4. Recently Searched Section

### Storage

`localStorage` key: `solidview:recent-searches`

```ts
interface RecentSearch {
  address: string;
  chain: ChainSlug;
  timestamp: number;
}
```

Array capped at 5 entries.

### Display

Section below the search bar on the home page. Each entry shows:
- Truncated address (`0x1234...5678`)
- Chain name badge beside it

Clicking navigates to `/{chain}/{address}`.

### Behavior

- New entries added on valid search submission.
- Duplicates (same address + chain) moved to top, not duplicated.
- Most recent first.

## 5. Persistent Header/Nav Bar

New component: `components/nav-header.tsx`

### Layout

```
[Key button] [Solidview (link to /)]          [Dark mode toggle]
```

- **Left:** Key icon button + "Solidview" text link to home.
- **Right:** Dark mode toggle (sun/moon icon).
- Replaces current raw layout with no navigation.
- Present on all pages (rendered in root `layout.tsx`).

## New Files

| File | Purpose |
|---|---|
| `components/nav-header.tsx` | Persistent header with key button, home link, theme toggle |
| `components/api-key-panel.tsx` | Sheet with primary + per-chain key inputs, validation |
| `components/theme-toggle.tsx` | Sun/moon dark mode toggle button |
| `components/recent-searches.tsx` | Recently searched contracts list |
| `components/providers.tsx` | Client-side providers (ThemeProvider, ApiKeyProvider) |
| `lib/api-key-context.tsx` | React Context for API keys |
| `app/api/keys/validate/route.ts` | Endpoint to test an API key against Etherscan V2 |
| `components/ui/sheet.tsx` | shadcn/ui Sheet component |
| `components/ui/collapsible.tsx` | shadcn/ui Collapsible component |

## Modified Files

| File | Changes |
|---|---|
| `app/layout.tsx` | Wrap children with Providers, add NavHeader, suppressHydrationWarning |
| `app/page.tsx` | Add RecentSearches below AddressInput |
| `components/address-input.tsx` | On submit, save to recent searches in localStorage |
| `app/[chain]/[address]/page.tsx` | Read client-provided API keys from context (or keep server-side env fallback) |
| `app/api/contract/[chain]/[address]/route.ts` | Accept optional client-provided API key in request headers |
| `package.json` | Add `next-themes` dependency |

## Dependencies

- `next-themes` — theme management for Next.js
- `@radix-ui/react-collapsible` — for shadcn/ui Collapsible (via `npx shadcn@latest add`)
- `@radix-ui/react-dialog` — for shadcn/ui Sheet (via `npx shadcn@latest add`)
