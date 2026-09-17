'use client';
/**
 * WHAT THE SERVER ALREADY KNOWS ABOUT THIS READER'S VIEW.
 *
 * ── THE DEFECT, AND WHY THE OBVIOUS FIX WAS NOT ENOUGH ──
 *
 * Density (`mv.tier`) and funnel state (`mv.funnel`) are the reader's own
 * choices and have always lived in `localStorage`, which the server cannot
 * read. So the server rendered a guess — `detailed` — and the reader's real
 * choice arrived one hydration later. Reported as "after refresh the page
 * shows pro mode for some time and then shows ultra or essentials".
 *
 * `Portal`'s skeleton (`prefsReady`) closes the WRONG-density window honestly,
 * but on its own it pays for that with the whole server render: every portal
 * route would open on blocks and wait for JavaScript before showing anything,
 * on every visit. That is a worse page than the one the defect describes.
 *
 * ── THE COOKIE ──
 *
 * So the same two values are ALSO written to a cookie, which the server does
 * get. `layout.tsx` reads them and hands them down through this context;
 * `Portal` opens its state on them instead of on a constant. The server then
 * renders the right density first time, hydration matches it exactly, and
 * there is no flash and no skeleton.
 *
 * THE SKELETON IS STILL THERE and still correct — it covers the one case the
 * cookie cannot: a reader who set a density BEFORE this cookie existed, whose
 * `localStorage` says `ultra` while the request carries nothing. They get the
 * skeleton once, the effect writes the cookie, and every later visit is served
 * directly. A brand-new reader has neither store and the default is right for
 * them, so they never see it either.
 *
 * `null` MEANS "the request said nothing", which is the state that turns the
 * skeleton on. It is not the same as a value that happens to equal the
 * default: a reader who deliberately chose Detailed has a cookie saying so,
 * and must not be made to wait behind a skeleton for a choice already known.
 *
 * NOT A SECURITY BOUNDARY, and it must not be mistaken for one. These are two
 * display preferences. `funnel` in particular decides which SAMPLE COPY the
 * shell shows, never what data is served — that is the session's business, and
 * `Portal`'s own note on adaptation 5 records that nothing in any response
 * distinguishes paid from trial from lapsed. A forged cookie changes nothing
 * but which labels the reader sees on their own screen.
 */
import React, { createContext, useContext } from 'react';

import type { Tier } from './bits';
import type { FunnelKey } from './Portal';
import { PORTAL_PREF_MAX_AGE } from '../../_lib/reference/portal-prefs';

export interface PortalPrefs {
  /** the density the request carried, or `null` when it carried none */
  tier: Tier | null;
  /** the funnel state the request carried, or `null` */
  funnel: FunnelKey | null;
}

const PrefsContext = createContext<PortalPrefs>({ tier: null, funnel: null });


/**
 * Mirror one preference into the cookie jar.
 *
 * `SameSite=Lax` because it is only ever read by this site's own navigations,
 * and no `Secure` flag so the value survives on `http://localhost` during
 * development — it carries nothing worth protecting in transit, per the note
 * above. Wrapped because a browser with cookies disabled must lose the
 * optimisation, not the page: `Portal` still has `localStorage` and, failing
 * that, the skeleton.
 */
export function writePortalPref(name: string, value: string): void {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${PORTAL_PREF_MAX_AGE}; samesite=lax`;
  } catch { /* cookies refused — localStorage and the skeleton still work */ }
}

export function PortalPrefsProvider(
  { tier, funnel, children }:
  { tier: Tier | null; funnel: FunnelKey | null; children: React.ReactNode },
) {
  /* the value is two strings off the request and changes only on navigation,
     so a memo here would cost more than it saves */
  return (
    <PrefsContext.Provider value={{ tier, funnel }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePortalPrefs(): PortalPrefs {
  return useContext(PrefsContext);
}
