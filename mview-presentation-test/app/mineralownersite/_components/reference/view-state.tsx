'use client';

/**
 * THE TWO AXES, READ BY A PAGE THAT DOES NOT OWN THEM.
 *
 * `Portal` holds them, the chrome sets them, and everything under the chrome
 * obeys them:
 *
 *   TIER    how much detail the reader WANTS — Ultra · Essentials · Detailed ·
 *           Pro, set in the avatar menu.
 *   FUNNEL  what the account IS, and therefore what it MAY see — the five
 *           states behind the top bar's account-state button.
 *
 * WHY A CONTEXT AND NOT A PROP. The Map is a route of its own that `Portal`
 * renders through `children`, and `children` arrives from a server component as
 * an opaque node — there is nothing to pass a prop to. A context reaches it
 * anyway, because the provider wraps it at render time.
 *
 * WHAT THIS REPLACED. The map used to carry its own copies of both controls in
 * its toolbar, remembering them under its own `mvMapDensity` and `mvMapFunnel`
 * keys. Once the map moved inside this shell that was the same two settings
 * offered twice on one screen, disagreeing with each other: the avatar menu
 * said Detailed while the toolbar said Essentials, and neither was wrong about
 * its own copy. One owner, one value, one place to change it.
 *
 * THE TIER HERE IS THE READER'S CHOICE, NOT THE EFFECTIVE ONE. `Portal` forces
 * Pro while nothing is claimed, which is right for a dashboard that is acting
 * as a shop window; the map has its own rule — `FUNNEL_CEILING` — under which a
 * free account stops at Essentials and the modes above it show locked rather
 * than vanishing. Handing over the raw choice lets each surface apply its own
 * rule instead of inheriting the other's.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Tier } from './bits';
import type { FunnelKey } from './Portal';

export interface PortalViewState {
  /** The reader's own density choice, before any surface's ceiling. */
  tier: Tier;
  /** Which kind of account the shell is being shown as. */
  funnel: FunnelKey;
}

const Ctx = createContext<PortalViewState | null>(null);

export function PortalViewStateProvider({
  tier,
  funnel,
  children,
}: PortalViewState & { children: ReactNode }) {
  /* Memoised on the two values rather than rebuilt each render: the map is a
     deep tree and this sits above all of it. */
  const value = useMemo(() => ({ tier, funnel }), [tier, funnel]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * The shell's two axes, or `null` outside it.
 *
 * NULLABLE ON PURPOSE. A caller that can render outside the portal has to say
 * what it does then, rather than being handed a default that silently looks
 * like a real answer.
 */
export function usePortalViewState(): PortalViewState | null {
  return useContext(Ctx);
}
