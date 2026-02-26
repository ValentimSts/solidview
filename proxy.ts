import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Rate limiting (API routes only)
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const CLEANUP_INTERVAL_MS = 60_000;

const requestLog = new Map<string, number[]>();
let lastCleanup = Date.now();

function cleanup(now: number) {
  const cutoff = now - WINDOW_MS;
  for (const [ip, timestamps] of requestLog) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      requestLog.delete(ip);
    } else {
      requestLog.set(ip, valid);
    }
  }
  lastCleanup = now;
}

function rateLimit(request: NextRequest, now: number): NextResponse | null {
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanup(now);
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  const cutoff = now - WINDOW_MS;
  const timestamps = requestLog.get(ip) ?? [];
  const recent = timestamps.filter((t) => t > cutoff);

  if (recent.length >= MAX_REQUESTS) {
    const oldestInWindow = recent[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);

    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  recent.push(now);
  requestLog.set(ip, recent);
  return null;
}

// ---------------------------------------------------------------------------
// Content-Security-Policy (all routes)
// ---------------------------------------------------------------------------

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

const isDev = process.env.NODE_ENV === "development";

function buildCspHeader(nonce: string): string {
  const directives = [
    "default-src 'self'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'unsafe-inline'", // fallback for browsers without nonce support
      "'wasm-unsafe-eval'", // shiki WASM regex engine
      isDev ? "'unsafe-eval'" : "", // Next.js Fast Refresh in dev
    ]
      .filter(Boolean)
      .join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  return directives.join("; ");
}

// ---------------------------------------------------------------------------
// Proxy entry point
// ---------------------------------------------------------------------------

export function proxy(request: NextRequest) {
  const now = Date.now();
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const blocked = rateLimit(request, now);
    if (blocked) return blocked;
  }

  // Generate nonce and set CSP header
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: [
    // Match all routes except Next.js static assets and favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
