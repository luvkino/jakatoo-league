/**
 * CASINO ACCESS SECURITY — server-only authorization for the hidden Casino.
 *
 * Design (fail-closed, no client-side trust):
 *   • The authorization secret lives ONLY in the server environment variable
 *     `CASINO_CODE`. It is never hard-coded, never bundled, never returned.
 *   • Access is granted by a signed, server-verified session token stored in an
 *     HTTP-only, SameSite=Lax, Secure-in-production *browser-session* cookie
 *     named `jl_casino` (no maxAge/expires => it dies with the browser session).
 *   • Secrets are compared with a constant-time comparison (`timingSafeEqual`).
 *   • If `CASINO_CODE` is missing or empty, every verification fails closed.
 *   • There is no documented/predictable default code.
 *
 * This module is imported ONLY by server code (route handlers, the casino page
 * layout). No client component may import it — that would pull the secret into
 * the browser bundle.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const CASINO_COOKIE = "jl_casino";

/** Server-side token lifetime. The cookie itself is a session cookie (no expiry). */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Signing key for the access token. Distinct from the CASINO_CODE secret. */
function signingSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "jackaroo";
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

/** Constant-time string equality (length check first is not a secret leak). */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The casino secret — server env only. Empty string when unset. */
export function getCasinoSecret(): string {
  return (process.env.CASINO_CODE ?? "").trim();
}

/** True only when a non-empty secret is configured. */
export function casinoCodeConfigured(): boolean {
  return getCasinoSecret().length > 0;
}

/**
 * Verify a completed candidate code against `CASINO_CODE`.
 * Fails closed: missing/empty secret or a non-string candidate always returns
 * false. The comparison is constant-time.
 */
export function verifyCasinoCode(candidate: unknown): boolean {
  const secret = getCasinoSecret();
  if (!secret) return false;
  if (typeof candidate !== "string") return false;
  return safeEqual(candidate, secret);
}

/** Create a signed, expiring access token for a freshly unlocked session. */
export function makeCasinoToken(): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `casino.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify a token's signature and expiry. Never trusts an unsigned value. */
export function isCasinoTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "casino") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(parts[2], sign(`${parts[0]}.${parts[1]}`));
}

type CookieGetter = { get(name: string): { value: string } | undefined };

/** Server-side authorization check from a cookie jar (layout or request). */
export function isCasinoAuthorized(cookies: CookieGetter): boolean {
  return isCasinoTokenValid(cookies.get(CASINO_COOKIE)?.value);
}

/** Convenience for NextRequest-style objects. */
export function isCasinoAuthorizedRequest(req: { cookies: CookieGetter } | NextRequest): boolean {
  return isCasinoAuthorized(req.cookies as CookieGetter);
}

/**
 * Browser-session cookie options. No `maxAge`/`expires` => the cookie is
 * cleared when the browser session ends (never a permanent authorization cookie).
 */
export const casinoCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

/* ------------------------------------------------------------------ rate limit */

export const UNLOCK_MAX_ATTEMPTS = 5;
export const UNLOCK_WINDOW_MS = 60_000;

/**
 * Sliding-window rate limiter for unlock attempts (5 / minute / IP).
 * The clock is injectable so the logic is unit-testable.
 */
export class UnlockRateLimiter {
  private hits = new Map<string, number[]>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** Returns true when the attempt is allowed; false when the limit is exceeded. */
  check(ip: string): boolean {
    const now = this.now();
    const recent = (this.hits.get(ip) ?? []).filter((t) => now - t < UNLOCK_WINDOW_MS);
    if (recent.length >= UNLOCK_MAX_ATTEMPTS) {
      this.hits.set(ip, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(ip, recent);
    // Bound memory: drop empty buckets when the map grows large.
    if (this.hits.size > 5000) {
      for (const [key, times] of this.hits) {
        if (times.length === 0) this.hits.delete(key);
      }
    }
    return true;
  }

  reset(): void {
    this.hits.clear();
  }
}

const limiter = new UnlockRateLimiter();

/** Shared production limiter used by the unlock route. */
export function checkUnlockRate(ip: string): boolean {
  return limiter.check(ip);
}
