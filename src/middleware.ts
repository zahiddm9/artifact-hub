import { NextRequest, NextResponse } from "next/server";

// In-memory fixed window per IP. Works for single-instance and demo deployments.
// For multi-instance production, replace store with @upstash/ratelimit + Redis.
const store = new Map<string, { count: number; resetAt: number }>();

const LIMITS: { method: string; pattern: RegExp; max: number; windowMs: number }[] = [
  { method: "POST", pattern: /^\/api\/artifacts$/,                       max: 10, windowMs: 60_000 },
  { method: "POST", pattern: /^\/api\/artifacts\/[^/]+\/feedback$/,      max: 30, windowMs: 60_000 },
  { method: "POST", pattern: /^\/api\/share$/,                           max: 20, windowMs: 60_000 },
  { method: "POST", pattern: /^\/api\/artifacts\/[^/]+\/summarize$/,     max:  5, windowMs: 60_000 },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = LIMITS.find(
    (r) => r.method === request.method && r.pattern.test(pathname)
  );
  if (!rule) return NextResponse.next();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  const key = `${ip}:${request.method}:${pathname}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + rule.windowMs });
    return NextResponse.next();
  }

  if (entry.count >= rule.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    });
  }

  entry.count += 1;
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/artifacts",
    "/api/artifacts/:id/feedback",
    "/api/artifacts/:id/summarize",
    "/api/share",
  ],
};
