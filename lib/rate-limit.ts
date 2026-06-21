import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter factory. Returns `null` when Upstash env vars are missing so
 * the app boots cleanly in local dev / preview without Redis credentials.
 * The `check()` helper below treats a missing limiter as "always allowed".
 */
function makeLimiter(
  prefix: string,
  tokens: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix,
  });
}

// Tighter limits for actions that touch the auth admin API or money.
const adminLimiter = makeLimiter("rl:admin", 5, "1 m");
// Default limit for normal mutating server actions.
const writeLimiter = makeLimiter("rl:write", 30, "1 m");

export type LimitKind = "admin" | "write";

export type LimitResult = {
  ok: boolean;
  remaining: number;
  reset: number;
};

/**
 * Check the rate limit for `identifier` (typically the auth user id). When
 * Upstash isn't configured this returns `{ ok: true }` so dev/preview works.
 */
export async function checkRateLimit(
  kind: LimitKind,
  identifier: string,
): Promise<LimitResult> {
  const limiter = kind === "admin" ? adminLimiter : writeLimiter;
  if (!limiter) {
    return { ok: true, remaining: Number.POSITIVE_INFINITY, reset: 0 };
  }
  try {
    const res = await limiter.limit(identifier);
    return { ok: res.success, remaining: res.remaining, reset: res.reset };
  } catch (err) {
    // Fail open: a Redis outage, network error, or bad/rotated Upstash token
    // must not take down the action it's protecting. Log so the misconfig is
    // still visible (Sentry/Vercel), but let the request through.
    console.error("Rate limit check failed; allowing request:", err);
    return { ok: true, remaining: Number.POSITIVE_INFINITY, reset: 0 };
  }
}

export function rateLimitError(kind: LimitKind): string {
  return kind === "admin"
    ? "Too many sensitive operations. Please wait a minute and try again."
    : "You're doing that too fast. Please slow down.";
}
