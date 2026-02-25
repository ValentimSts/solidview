# Security

Solidview is a read-only, stateless smart contract explorer. It has no database, no authentication system, and no user sessions. The attack surface is therefore narrow: URL parameter injection, API key leakage, abusive API traffic, and request body manipulation are the primary concerns.

This document covers every security control currently in place.

---

## 1. Security Headers

All responses — pages and API routes alike — include the following HTTP headers, configured via the `headers()` export in `next.config.ts`.

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing a response away from the declared content type. |
| `X-Frame-Options` | `DENY` | Blocks the application from being embedded in an `<iframe>`, preventing clickjacking attacks. |
| `X-XSS-Protection` | `0` | Explicitly disables the legacy browser XSS auditor, which can itself be exploited. Modern browsers rely on CSP instead. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends the full URL as the referrer for same-origin requests, but only the origin for cross-origin ones, hiding path and query information from third parties. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables access to device APIs that the application has no reason to use. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS for two years across the origin and all subdomains, and opts the domain into browser HSTS preload lists. |

**Source:** `next.config.ts`

### Pending: Content-Security-Policy

A `Content-Security-Policy` (CSP) header is not yet configured. Next.js injects inline scripts during hydration, and Tailwind CSS 4 uses inline styles, both of which require `unsafe-inline` allowances that reduce the value of a naive CSP. A nonce-based CSP is planned once the build pipeline supports nonce injection.

---

## 2. Rate Limiting

The proxy at `proxy.ts` applies an IP-based sliding window rate limiter to all `/api/*` routes before any route handler is reached.

### Parameters

| Parameter | Value |
|---|---|
| Scope | All routes matching `/api/:path*` |
| Window | 60 seconds |
| Limit | 30 requests per window per IP |
| IP source | `X-Forwarded-For` header (first address), falls back to `"unknown"` |
| Cleanup interval | Every 60 seconds |
| Storage | In-memory `Map` |

### Behaviour

When a client exceeds the limit, the proxy returns HTTP `429 Too Many Requests` with a `Retry-After` header indicating how many seconds remain until the oldest request in the window expires and a new slot opens.

```
HTTP/1.1 429 Too Many Requests
Retry-After: 42
Content-Type: application/json

{ "error": "Too many requests" }
```

Stale entries (IPs with no requests in the last 60 seconds) are pruned periodically to prevent unbounded memory growth.

### Known Limitation

The `Map` is process-local. In a multi-instance deployment (e.g. multiple Node.js processes behind a load balancer), each process maintains its own counter, so the effective limit per IP is `30 * N` where `N` is the number of instances. A shared store (Redis, Upstash, etc.) would be required to enforce the limit globally.

---

## 3. Input Validation

Every API route validates its inputs before performing any work.

### URL Parameters

All routes that accept dynamic segments (`[chain]` and `[address]`) validate them immediately:

- **`chain`** — validated against the set of known chain slugs via `isValidChainSlug()` (`lib/chains.ts`). Any unrecognised value returns HTTP `400`.
- **`address`** — validated as a well-formed Ethereum address via viem's `isAddress()`. Any value that fails this check returns HTTP `400`.

### API Key Format (`x-api-key` Header)

The contract proxy route (`/api/contract/[chain]/[address]`) accepts an optional `x-api-key` request header containing a user-supplied Etherscan API key. The value is matched against:

```
/^[a-zA-Z0-9-]{10,64}$/
```

Keys shorter than 10 characters, longer than 64 characters, or containing any character outside the alphanumeric-and-hyphen set are rejected with HTTP `400`. This prevents injection of special characters into query strings before the value is forwarded to Etherscan.

**Source:** `app/api/contract/[chain]/[address]/route.ts`

### Request Body (POST Routes)

The read route (`/api/read/[chain]/[address]`) and the key validation route (`/api/keys/validate`) parse JSON request bodies with the following controls.

**Size limits**

| Route | Max body size |
|---|---|
| `/api/read/[chain]/[address]` | 10,000 bytes (10 KB) |
| `/api/keys/validate` | 10,240 bytes (10 KB) |

Bodies exceeding the limit return HTTP `413` before JSON parsing begins. Malformed JSON returns HTTP `400`.

**Field validation — read route**

| Field | Requirement |
|---|---|
| `functionName` | Required. Must be a non-empty string. |
| `args` | Required. Must be an array with at most 20 items. |
| `abi` | Required. Must be an array with exactly 1 item. |

The single ABI item is then passed to `validateAbiItem()` from `lib/abi-validation.ts`, which applies the following checks in order:

1. The value must be a non-null object.
2. `type` must equal `"function"`.
3. `name` must be a non-empty string.
4. `stateMutability` must be `"view"` or `"pure"` — write operations (`nonpayable`, `payable`) are rejected.
5. `inputs` must be an array with at most 20 items.
6. `outputs` must be an array with at most 20 items.

This validation ensures that only read-only contract calls can be executed through the read API, regardless of what ABI fragment a caller submits.

**Source:** `lib/abi-validation.ts`, `app/api/read/[chain]/[address]/route.ts`

**Field validation — key validation route**

| Field | Requirement |
|---|---|
| `apiKey` | Required. Must be a non-empty string. |
| `chainId` | Required. Must be a number. |

**Source:** `app/api/keys/validate/route.ts`

---

## 4. Error Sanitization

Internal error details are never included in API responses. The pattern used across all routes is:

```typescript
} catch (error) {
  const message =
    error instanceof EtherscanError
      ? error.message
      : "Failed to fetch contract data";
  return Response.json({ error: message }, { status: 404 });
}
```

Only `EtherscanError` instances — errors that originate from known, controlled paths within the Etherscan client — have their message forwarded to the caller. All other exceptions (network errors, unexpected runtime failures, etc.) are replaced with a generic string. The three generic fallback messages used across the codebase are:

- `"Failed to fetch contract data"` — contract proxy route
- `"Read call failed"` — read route
- `"Failed to validate API key"` — key validation route

On the client side, Next.js error boundaries in `app/error.tsx` and `app/[chain]/[address]/error.tsx` catch unhandled rendering errors and display a generic "Something went wrong" message without exposing stack traces or internal state.

---

## 5. API Key Handling

### Server-Side Key

The primary Etherscan API key is stored in the `ETHERSCAN_API_KEY` environment variable. It is read server-side only (`lib/etherscan.ts`) and is never serialised into client bundles or included in any response body.

The `/api/chains/status` route tells the client whether a server key is configured (a boolean), but never reveals the key itself.

### Client-Supplied Keys

Users may supply their own Etherscan API keys through the API key panel in the UI. These keys are:

- Stored exclusively in React Context (`lib/api-key-context.tsx`) — an in-memory, component-tree-scoped store.
- Never written to `localStorage`, `sessionStorage`, cookies, or any other persistent browser storage.
- Sent to the server only via the `x-api-key` request header on a per-request basis, over HTTPS.

### Cache Isolation

When a client-supplied key is used, the persistent Next.js Data Cache (L2) is bypassed for that request. This prevents a user's custom-key response from being stored and subsequently served to other users under the server's shared cache. The in-memory L1 cache is also not populated for custom-key responses.

**Source:** `lib/etherscan.ts` (`fetchContractAbi`, `fetchContractSource`)

### Key Validation

Before being accepted as valid, user-supplied keys are tested against Etherscan's `stats/ethsupply` endpoint — a lightweight, read-only call with no side effects. The validation request has a 10-second timeout via `AbortSignal.timeout`. The format of the key is validated against the regex pattern (see Section 3) before any network call is made.

**Source:** `app/api/keys/validate/route.ts`

---

## 6. Network Security

### HTTPS Enforcement

All outbound requests to the Etherscan V2 API use the `https://api.etherscan.io/v2/api` endpoint. The `Strict-Transport-Security` header enforces HTTPS for inbound connections with a two-year `max-age` and `preload` support.

### Fetch Timeouts

The key validation route applies a 10-second timeout to its outbound Etherscan request using the standard `AbortSignal.timeout(10_000)` API. If the request does not complete within that window, the catch block returns HTTP `500` with the generic error message.

Fetches within `unstable_cache` callbacks (`lib/etherscan.ts`) do not use `AbortSignal.timeout` because Next.js ISR and build-time rendering do not support abort signals in that context.

### CORS

No `Access-Control-Allow-Origin` or related CORS headers are set on API routes. Next.js defaults to same-origin responses, meaning the API routes are not accessible from other origins via browser requests.

### RPC Transport

The viem client (`lib/viem-client.ts`) supports a fallback transport: if a `RPC_URL_<CHAIN>` environment variable is set, it is used as the primary transport with the chain's default public RPC URL as the fallback. This allows private or authenticated RPC endpoints to be used in production without exposing them in client code.
