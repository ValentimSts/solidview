# Solidview API Reference

This document describes all four HTTP API routes exposed by the Solidview backend. Every route is prefixed with `/api` and is subject to IP-based rate limiting enforced by the Next.js middleware layer.

---

## Table of Contents

1. [Rate Limiting](#rate-limiting)
2. [Route 1 — GET /api/contract/\[chain\]/\[address\]](#route-1--get-apicontractchainaddress)
3. [Route 2 — POST /api/read/\[chain\]/\[address\]](#route-2--post-apireadchainaddress)
4. [Route 3 — GET /api/chains/status](#route-3--get-apichainsstatus)
5. [Route 4 — POST /api/keys/validate](#route-4--post-apikeysvalidate)
6. [Error Format](#error-format)

---

## Rate Limiting

All routes matching `/api/:path*` are protected by a sliding-window rate limiter implemented in `proxy.ts`.

| Parameter        | Value                                       |
|------------------|---------------------------------------------|
| Window           | 60 seconds                                  |
| Max requests     | 30 per window per IP                        |
| Algorithm        | Sliding window (timestamp log per IP)       |
| IP extraction    | `X-Forwarded-For` header, first value only  |
| Fallback IP      | `"unknown"` when the header is absent       |

When the limit is exceeded the server returns **HTTP 429** with a `Retry-After` header indicating how many seconds the client must wait before its oldest request in the current window expires.

```
HTTP/1.1 429 Too Many Requests
Retry-After: 42
Content-Type: application/json

{ "error": "Too many requests" }
```

---

## Route 1 — GET /api/contract/\[chain\]/\[address\]

Fetches the ABI, metadata, and source code for a verified smart contract from the Etherscan V2 API. The two Etherscan calls (`getabi` and `getsourcecode`) are issued in parallel.

**Source:** `app/api/contract/[chain]/[address]/route.ts`

### URL Parameters

| Parameter | Type   | Required | Description                                                                 |
|-----------|--------|----------|-----------------------------------------------------------------------------|
| `chain`   | string | Yes      | Chain slug. One of: `ethereum`, `arbitrum`, `optimism`, `base`, `polygon`  |
| `address` | string | Yes      | `0x`-prefixed 20-byte Ethereum address, checksummed or lowercase            |

### Request Headers

| Header       | Required | Description                                                                                                                             |
|--------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------|
| `x-api-key`  | No       | User-provided Etherscan API key. Must match `/^[a-zA-Z0-9-]{10,64}$/`. When omitted the server falls back to the `ETHERSCAN_API_KEY` environment variable. |

### API Key Resolution

The route resolves the API key in the following priority order:

1. `x-api-key` request header (validated against the pattern above).
2. `ETHERSCAN_API_KEY` server-side environment variable.

If neither source provides a key, the route returns **HTTP 500** before making any upstream call.

### Success Response

**Status:** `200 OK`

```json
{
  "abi": [
    {
      "type": "function",
      "name": "balanceOf",
      "stateMutability": "view",
      "inputs": [{ "name": "account", "type": "address" }],
      "outputs": [{ "name": "", "type": "uint256" }]
    }
  ],
  "metadata": {
    "name": "MyToken",
    "compilerVersion": "v0.8.20+commit.a1b79de6",
    "optimizationUsed": true,
    "runs": 200,
    "license": "MIT",
    "evmVersion": "paris"
  },
  "source": {
    "files": {
      "MyToken.sol": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n..."
    },
    "language": "Solidity"
  }
}
```

**Cache headers returned with every 200 response:**

```
Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800
```

| Directive              | Value    | Meaning                                              |
|------------------------|----------|------------------------------------------------------|
| `max-age`              | 3 600 s  | Browsers cache the response for 1 hour               |
| `s-maxage`             | 86 400 s | CDN/proxy cache for 24 hours                         |
| `stale-while-revalidate` | 604 800 s | Serve stale for up to 7 days while revalidating |

### Error Responses

| Status | Condition                                                                      | Response body                                  |
|--------|--------------------------------------------------------------------------------|------------------------------------------------|
| 400    | `chain` is not one of the supported slugs                                      | `{ "error": "Unsupported chain: <chain>" }`    |
| 400    | `address` fails `isAddress()` validation                                       | `{ "error": "Invalid Ethereum address" }`      |
| 400    | `x-api-key` header present but does not match `/^[a-zA-Z0-9-]{10,64}$/`       | `{ "error": "Invalid API key format" }`        |
| 404    | Contract not verified, or Etherscan returned an error                          | `{ "error": "<Etherscan error message>" }`     |
| 404    | Any other fetch failure                                                        | `{ "error": "Failed to fetch contract data" }` |
| 500    | No API key configured on the server and no `x-api-key` header provided        | `{ "error": "Etherscan API key not configured" }` |

### Example curl Commands

**With a user-supplied API key:**

```bash
curl -H "x-api-key: YOUR_ETHERSCAN_API_KEY" \
  "https://solidview.example.com/api/contract/ethereum/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
```

**Relying on the server-side key (no header):**

```bash
curl "https://solidview.example.com/api/contract/base/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
```

**Checking an Arbitrum contract:**

```bash
curl -H "x-api-key: YOUR_ETHERSCAN_API_KEY" \
  "https://solidview.example.com/api/contract/arbitrum/0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
```

---

## Route 2 — POST /api/read/\[chain\]/\[address\]

Executes a single read-only (`view` or `pure`) function call against a deployed contract using a viem public client. The function is called on-chain via the chain's configured RPC endpoint; no API key is required.

**Source:** `app/api/read/[chain]/[address]/route.ts`

### URL Parameters

| Parameter | Type   | Required | Description                                                                 |
|-----------|--------|----------|-----------------------------------------------------------------------------|
| `chain`   | string | Yes      | Chain slug. One of: `ethereum`, `arbitrum`, `optimism`, `base`, `polygon`  |
| `address` | string | Yes      | `0x`-prefixed 20-byte Ethereum address of the contract to call             |

### Request Body

`Content-Type: application/json` — maximum raw body size is **10 KB**.

| Field          | Type     | Required | Description                                                                       |
|----------------|----------|----------|-----------------------------------------------------------------------------------|
| `functionName` | string   | Yes      | Name of the function to call. Must be a non-empty string.                        |
| `args`         | array    | Yes      | Positional arguments for the function call. Maximum 20 items.                    |
| `abi`          | array    | Yes      | A single-element array containing the ABI fragment for the function being called. |

**ABI fragment validation** (enforced by `lib/abi-validation.ts` — `validateAbiItem`):

| Rule                          | Detail                                                            |
|-------------------------------|-------------------------------------------------------------------|
| Must be an object             | Rejects `null`, primitives, and arrays                           |
| `type` must be `"function"`   | Constructor, event, and error fragments are rejected             |
| `name` must be a non-empty string | Unnamed functions are rejected                              |
| `stateMutability` must be `"view"` or `"pure"` | State-mutating functions are rejected      |
| `inputs` must be an array     | Maximum 20 elements                                              |
| `outputs` must be an array    | Maximum 20 elements                                              |

```json
{
  "functionName": "balanceOf",
  "args": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
  "abi": [
    {
      "type": "function",
      "name": "balanceOf",
      "stateMutability": "view",
      "inputs": [{ "name": "account", "type": "address" }],
      "outputs": [{ "name": "", "type": "uint256" }]
    }
  ]
}
```

### Success Response

**Status:** `200 OK`

The `result` field contains the decoded return value of the function. Because JSON does not support 64-bit integers, all `bigint` values returned by viem are serialized as **decimal strings**.

```json
{ "result": "1000000000000000000" }
```

For functions returning multiple values or structs, `result` will be an array or object respectively:

```json
{ "result": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "1000000000000000000"] }
```

For functions returning a `bool`:

```json
{ "result": true }
```

### Error Responses

| Status | Condition                                                                             | Response body                                                        |
|--------|---------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| 400    | `chain` is not a valid slug, or `address` fails `isAddress()`                        | `{ "error": "Invalid chain or address" }`                            |
| 400    | Body is not valid JSON                                                                | `{ "error": "Invalid JSON body" }`                                   |
| 400    | Body is not a JSON object                                                             | `{ "error": "Request body must be an object" }`                      |
| 400    | `functionName` is missing or not a non-empty string                                  | `{ "error": "functionName is required" }`                            |
| 400    | `args` is not an array, or has more than 20 items                                    | `{ "error": "args must be an array with at most 20 items" }`         |
| 400    | `abi` is not an array, or does not contain exactly 1 element                         | `{ "error": "abi must be an array with exactly 1 function" }`        |
| 400    | ABI item fails `validateAbiItem` (see rules above)                                   | `{ "error": "<validation message>" }`                                |
| 413    | Raw request body exceeds 10 KB                                                       | `{ "error": "Request body too large" }`                              |
| 500    | The viem `readContract` call reverts, throws, or times out                           | `{ "error": "Read call failed" }`                                    |

### Example curl Commands

**Query ERC-20 balance on Ethereum:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "functionName": "balanceOf",
    "args": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
    "abi": [{
      "type": "function",
      "name": "balanceOf",
      "stateMutability": "view",
      "inputs": [{ "name": "account", "type": "address" }],
      "outputs": [{ "name": "", "type": "uint256" }]
    }]
  }' \
  "https://solidview.example.com/api/read/ethereum/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
```

**Query a no-argument view function:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "functionName": "totalSupply",
    "args": [],
    "abi": [{
      "type": "function",
      "name": "totalSupply",
      "stateMutability": "view",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint256" }]
    }]
  }' \
  "https://solidview.example.com/api/read/base/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
```

---

## Route 3 — GET /api/chains/status

Returns whether the server has an Etherscan API key configured for each supported chain. Because Solidview uses the unified Etherscan V2 endpoint with a `chainid` parameter, a single `ETHERSCAN_API_KEY` environment variable covers all chains simultaneously. Every chain therefore returns the same boolean value.

**Source:** `app/api/chains/status/route.ts`

### URL Parameters

None.

### Request Headers

None required.

### Success Response

**Status:** `200 OK`

Each key is a chain slug. The value is `true` when `ETHERSCAN_API_KEY` is set in the server environment, and `false` otherwise.

```json
{
  "ethereum": true,
  "arbitrum": true,
  "optimism": true,
  "base": true,
  "polygon": true
}
```

This endpoint is used by the UI's API key panel to indicate to users which chains are already covered by a server-side key, and which require them to supply their own key.

### Error Responses

| Status | Condition         | Response body |
|--------|-------------------|---------------|
| 429    | Rate limit exceeded | `{ "error": "Too many requests" }` |

This route has no application-level error conditions of its own. Any failure would surface as an unhandled Next.js 500.

### Example curl Commands

```bash
curl "https://solidview.example.com/api/chains/status"
```

---

## Route 4 — POST /api/keys/validate

Validates a user-supplied Etherscan API key by making a live test request to the Etherscan V2 API (`stats/ethsupply`). This endpoint is called by the UI's API key panel after the user enters a key to provide immediate feedback before any contract lookup is attempted.

**Source:** `app/api/keys/validate/route.ts`

### URL Parameters

None.

### Request Body

`Content-Type: application/json` — maximum raw body size is **10 240 bytes** (~10 KB).

| Field     | Type   | Required | Description                                                            |
|-----------|--------|----------|------------------------------------------------------------------------|
| `apiKey`  | string | Yes      | The Etherscan API key to validate. Must be a non-empty string.        |
| `chainId` | number | Yes      | The numeric EVM chain ID used for the test call (e.g. `1` for Ethereum). |

```json
{
  "apiKey": "YOUR_ETHERSCAN_API_KEY",
  "chainId": 1
}
```

### Implementation Detail

The route constructs a request to `https://api.etherscan.io/v2/api` with the following query parameters:

```
?chainid=<chainId>&module=stats&action=ethsupply&apikey=<apiKey>
```

The upstream request has a **10-second timeout** (`AbortSignal.timeout(10_000)`). The key is considered valid when Etherscan returns `"status": "1"` in its response body.

### Success Response

**Status:** `200 OK`

When the key is valid:

```json
{ "valid": true }
```

When the key is invalid (Etherscan returns `status !== "1"`):

```json
{ "valid": false, "error": "Invalid API key" }
```

Note that both the valid and invalid cases return **HTTP 200**. The `valid` boolean field is the primary signal; the caller should not rely on HTTP status to distinguish a valid key from an invalid one.

### Error Responses

| Status | Condition                                                         | Response body                                              |
|--------|-------------------------------------------------------------------|------------------------------------------------------------|
| 400    | Body is not valid JSON                                            | `{ "valid": false, "error": "Invalid JSON body" }`         |
| 400    | `apiKey` is missing, empty, or not a string                       | `{ "valid": false, "error": "API key is required" }`       |
| 400    | `chainId` is missing or not a number                              | `{ "valid": false, "error": "Chain ID is required" }`      |
| 413    | Raw request body exceeds 10 240 bytes                             | `{ "valid": false, "error": "Request body too large" }`    |
| 500    | Upstream fetch to Etherscan threw (e.g. timeout, DNS failure)     | `{ "valid": false, "error": "Failed to validate API key" }` |
| 502    | Etherscan returned a non-2xx HTTP status                          | `{ "valid": false, "error": "Etherscan API unavailable" }` |

### Example curl Commands

**Validate a key against Ethereum mainnet (chainId 1):**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{ "apiKey": "YOUR_ETHERSCAN_API_KEY", "chainId": 1 }' \
  "https://solidview.example.com/api/keys/validate"
```

**Validate a key for Arbitrum One (chainId 42161):**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{ "apiKey": "YOUR_ETHERSCAN_API_KEY", "chainId": 42161 }' \
  "https://solidview.example.com/api/keys/validate"
```

---

## Error Format

All error responses use the same JSON envelope:

```json
{ "error": "Human-readable error message" }
```

Routes 3 and 4 additionally include a `valid` field in their error envelopes so that callers can distinguish validation outcomes from transport errors without inspecting HTTP status codes:

```json
{ "valid": false, "error": "Human-readable error message" }
```

### Chain ID Reference

| Chain slug  | Numeric chain ID |
|-------------|-----------------|
| `ethereum`  | 1               |
| `arbitrum`  | 42161           |
| `optimism`  | 10              |
| `base`      | 8453            |
| `polygon`   | 137             |
