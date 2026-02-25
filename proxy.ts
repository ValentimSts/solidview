import { NextRequest, NextResponse } from "next/server";

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

export function proxy(request: NextRequest) {
  const now = Date.now();

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

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
