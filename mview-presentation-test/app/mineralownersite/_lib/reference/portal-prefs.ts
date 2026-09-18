/**
 * THE TWO DISPLAY PREFERENCES, NAMED IN A MODULE BOTH SIDES CAN IMPORT.
 *
 * `prefs-context.tsx` is `'use client'` and `Portal.tsx` is too, and a SERVER
 * component that imports a value from either gets a client-reference proxy
 * rather than the value — measured, `FUNNEL.map is not a function` thrown out
 * of the layout that tried to validate a cookie against it. Constants that the
 * server and the browser both need therefore live here, in a module with no
 * directive, which either side can import for real.
 *
 * The key lists are duplicated from `Portal`'s `FUNNEL` and `bits`' `TIERS` on
 * purpose and are kept honest by the two assertions at the foot of this file:
 * they are typed as the unions those modules export, so a key added or renamed
 * there fails the build here rather than silently falling through the cookie
 * validation as "unknown".
 */
import type { Tier } from '../../_components/reference/bits';
import type { FunnelKey } from '../../_components/reference/Portal';

export const PORTAL_TIER_COOKIE = 'mv.tier';
export const PORTAL_FUNNEL_COOKIE = 'mv.funnel';

/** a year, because it is a preference and not a session */
export const PORTAL_PREF_MAX_AGE = 60 * 60 * 24 * 365;

export const PORTAL_TIERS = ['ultra', 'simple', 'detailed', 'pro'] as const;
export const PORTAL_FUNNELS = [
  'unclaimed', 'claimed', 'trial', 'lapsed', 'paid',
] as const;

/* the build fails here if either union grows a member these lists do not carry,
   or carries one the union does not know */
const _tiers: readonly Tier[] = PORTAL_TIERS;
const _funnels: readonly FunnelKey[] = PORTAL_FUNNELS;
type _TierCovered = Exclude<Tier, typeof PORTAL_TIERS[number]> extends never ? true : never;
type _FunnelCovered = Exclude<FunnelKey, typeof PORTAL_FUNNELS[number]> extends never ? true : never;
const _tierCheck: _TierCovered = true;
const _funnelCheck: _FunnelCovered = true;
void _tiers; void _funnels; void _tierCheck; void _funnelCheck;

/**
 * Read one preference off a cookie value, or `null` when the request carried
 * nothing this module recognises. A cookie is a string from the client, so an
 * unknown value is dropped rather than passed on — `null` is the same state as
 * no cookie at all, and the caller's own default takes over.
 */
export function readPortalPref<T extends string>(
  raw: string | undefined, allowed: readonly T[],
): T | null {
  if (!raw) return null;
  let v: string;
  try { v = decodeURIComponent(raw); } catch { return null; }
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}
