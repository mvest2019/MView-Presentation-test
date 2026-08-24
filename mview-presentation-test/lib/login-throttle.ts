import "server-only";

import { headers } from "next/headers";

/**
 * Brute-force throttle for the sign-in action: 10 failures in a minute earns a
 * two-minute block (Ryan, 2026-08-19).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE TREATING SIGN-IN AS RATE LIMITED.
 *
 * THIS IS DEFENCE IN DEPTH, NOT THE FIX. It guards the route through this app;
 * it cannot guard the account. `POST /api/v1/User/login_user` on the API host is
 * public, so anyone willing to skip the website entirely is unaffected by
 * anything in this file. The throttle that actually protects an account has to
 * live on the API, and that is a backend request, not a frontend change.
 *
 * Two further limits, both inherent to where this runs:
 *
 *   · THE COUNTERS ARE IN PROCESS MEMORY. On Vercel each lambda instance keeps
 *     its own, so ten attempts spread across instances can each be counted as
 *     one or two. A cold start clears everything. Shared state needs Redis or
 *     similar, which this project has no dependency for.
 *   · IP IS WHATEVER THE PROXY REPORTS. `x-forwarded-for` is trivially spoofed
 *     unless the platform overwrites it, and a large NAT shares one address, so
 *     the IP bucket is deliberately the looser of the two.
 *
 * What it does buy: a scripted guess-loop pointed at this form stops being free,
 * and a single targeted account cannot be walked through a password list through
 * the UI. Worth having, worth not overstating.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Failures counted inside this window. */
const WINDOW_MS = 60_000;
/**
 * Failures within the window that trip the block — the TENTH does, not the
 * eleventh.
 *
 * Measured before fixing: the trip was `> MAX_FAILURES`, so the block was set
 * only once an eleventh failure had been recorded, which means the eleventh
 * attempt had already been sent upstream. Eleven requests reached
 * `login_user` for a "ten attempts" rule. `>=` makes the tenth the last one that
 * costs the API anything, and every attempt after it is refused here.
 */
const MAX_FAILURES = 10;
/** How long a tripped bucket stays blocked. */
const BLOCK_MS = 120_000;
/**
 * Buckets untouched for this long are dropped. Without it the map is itself a
 * slow memory leak — and a way to grow it on purpose, one made-up address per
 * request.
 */
const IDLE_MS = 10 * 60_000;

type Bucket = {
  /** Timestamps of recent failures, oldest first. */
  failures: number[];
  /** Epoch ms until which this key is blocked; 0 when it is not. */
  blockedUntil: number;
  /** Last touch, for pruning. */
  seen: number;
};

const buckets = new Map<string, Bucket>();

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.seen > IDLE_MS && bucket.blockedUntil <= now) {
      buckets.delete(key);
    }
  }
}

function bucketFor(key: string, now: number): Bucket {
  const existing = buckets.get(key);
  if (existing) {
    existing.seen = now;
    return existing;
  }
  const fresh: Bucket = { failures: [], blockedUntil: 0, seen: now };
  buckets.set(key, fresh);
  return fresh;
}

/**
 * The client's address, or `null` when the platform does not tell us.
 *
 * NULL RATHER THAN A PLACEHOLDER, deliberately. Falling back to a constant like
 * "unknown" would put every anonymous caller in ONE bucket, so ten failures from
 * ten unrelated people would lock out an eleventh — a self-inflicted denial of
 * service. No address means no IP bucket; the email bucket still applies.
 */
async function clientIp(): Promise<string | null> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  // Left-most entry is the original client; the rest are proxies.
  const first = forwarded?.split(",")[0]?.trim();
  return first || store.get("x-real-ip")?.trim() || null;
}

/** Both buckets a sign-in attempt counts against. */
async function keysFor(email: string): Promise<string[]> {
  const keys = [`email:${email.trim().toLowerCase()}`];
  const ip = await clientIp();
  if (ip) keys.push(`ip:${ip}`);
  return keys;
}

/** "2 minutes", "1 minute", "45 seconds" — for the message, never a bare ms. */
function humanise(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export type ThrottleState = { blocked: false } | { blocked: true; message: string };

/**
 * Whether this attempt should be refused WITHOUT touching the API.
 *
 * Call before `loginUser`. Refusing here is the point: a blocked attempt must not
 * reach the upstream, or the throttle protects nothing but our own error message.
 */
export async function checkLoginThrottle(email: string): Promise<ThrottleState> {
  const now = Date.now();
  prune(now);

  let longest = 0;
  for (const key of await keysFor(email)) {
    const bucket = bucketFor(key, now);
    if (bucket.blockedUntil > now) {
      longest = Math.max(longest, bucket.blockedUntil - now);
    }
  }

  if (longest === 0) return { blocked: false };
  return {
    blocked: true,
    /* Counts down rather than always claiming two minutes: after ninety seconds
       of waiting, "try again in 2 minutes" is simply wrong, and a message that
       never changes reads as though the wait never started. */
    message: `Too many failed login attempts. Please try again in ${humanise(longest)}.`,
  };
}

/**
 * Records one rejected attempt, and trips the block on the eleventh.
 *
 * ONLY FOR REJECTED CREDENTIALS — see `credentialsRejected` on `AuthResult`. An
 * unreachable or misconfigured API must not count, or an outage becomes a
 * lockout.
 */
export async function recordLoginFailure(email: string): Promise<void> {
  const now = Date.now();
  for (const key of await keysFor(email)) {
    const bucket = bucketFor(key, now);
    // Drop anything older than the window, so this is a sliding count and not a
    // total that never resets.
    bucket.failures = bucket.failures.filter((at) => now - at < WINDOW_MS);
    bucket.failures.push(now);
    if (bucket.failures.length >= MAX_FAILURES) {
      bucket.blockedUntil = now + BLOCK_MS;
      // Cleared so the count starts fresh when the block lifts; leaving them
      // would re-trip the block on the first failure after it expired.
      bucket.failures = [];
    }
  }
}

/**
 * Clears both buckets after a successful sign-in.
 *
 * Otherwise a few typos followed by the right password would leave the count
 * standing, and a later mistake could lock out someone who has already proved
 * they own the account.
 */
export async function clearLoginFailures(email: string): Promise<void> {
  for (const key of await keysFor(email)) buckets.delete(key);
}
