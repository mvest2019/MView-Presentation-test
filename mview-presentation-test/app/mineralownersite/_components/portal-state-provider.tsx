"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  DEFAULT_FUNNEL_STATE,
  DEFAULT_VIEW_TIER,
  FUNNEL_STATE_CLASS,
  STORAGE_KEYS,
  normaliseStateParam,
  stateAccess,
  toFunnelState,
  toViewTier,
  viewTierClasses,
  type FunnelState,
  type StateAccess,
  type ViewTier,
} from "../_lib/portal-state";

/**
 * The portal root: it owns the two gating classes and nothing else.
 *
 * WHAT THIS COMPONENT IS FOR, and why it is so thin. `portal.css` does the
 * actual gating — one class here re-styles the whole subtree beneath it. So this
 * component's entire job is to decide which two classes go on one `<div>`, and
 * to tell the top bar's controls what is currently selected so they can render
 * their own selected state.
 *
 * ITS CHILDREN ARE NOT CLIENT COMPONENTS. Everything inside is passed through as
 * `children`, so the sidebar copy, the pinned bar, the funnel bar, the state
 * card and the whole Dashboard stay server-rendered — a density or state change
 * swaps a class string, and React re-renders one `<div>`, not a page of cards.
 * That is the reason the gate is CSS and not conditional rendering.
 *
 * BOTH AXES READ FROM THE URL FIRST, which is the reference's contract:
 *
 *   `?state=` — clause: "Deep-linkable: #/app?state=noclaim | trial | lapsed |
 *   paid | claimed", so QA and reviewers can screenshot any funnel state cold.
 *   The old v9 spelling `noclaim` still resolves, because its links are still
 *   out there.
 *
 *   `?view=` — RV-03 clause 5. A deep link always beats the saved choice.
 *
 * FIRST PAINT IS THE DEFAULT, DELIBERATELY. When no `?view=` is present the
 * saved density comes from `localStorage`, which the server cannot read — so the
 * very first paint is Essentials and the stored choice lands on hydration. That
 * is the reference's own behaviour: it pre-paints the Essentials default
 * precisely "so first paint never flashes Detailed", then re-applies the saved
 * one. Guessing instead would flash the wrong density for every owner who never
 * changed it.
 */

interface PortalStateValue {
  funnelState: FunnelState;
  viewTier: ViewTier;
  access: StateAccess;
}

const PortalStateContext = createContext<PortalStateValue | null>(null);

/* ----------------------------------------------------------------------------
   THE SAVED DENSITY, as an external store.

   `localStorage` IS an external system, so `useSyncExternalStore` is the tool
   React provides for reading one — rather than an effect that reads it and
   calls `setState`, which cascades a second render and is what
   `react-hooks/set-state-in-effect` objects to.

   It buys a real behaviour on top of that: subscribing to `storage` events
   means changing density in one tab updates every other open tab, which the
   effect version could not do.

   Both callbacks are module-level so their identity is stable across renders —
   a `subscribe` that changed each render would resubscribe on every one.
   ---------------------------------------------------------------------------- */

function subscribeToStoredTier(onChange: () => void): () => void {
  // `storage` fires in OTHER tabs, which is exactly the cross-tab case.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Returns the raw stored string — a primitive, so React's `===` comparison is
 * stable and cannot loop. Any read can throw (private mode, blocked site data,
 * a browser that errors on access), and `null` is the right answer when it does.
 */
function readStoredTier(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.viewTier);
  } catch {
    return null;
  }
}

/**
 * On the server there is no storage to read, so the default is the honest
 * answer — and it is the same default the reference pre-paints "so first paint
 * never flashes Detailed".
 */
function readStoredTierOnServer(): string | null {
  return null;
}

/**
 * For the top bar's controls, which need to know what is selected to draw their
 * own `.on` state and `aria-selected`. Everything else should be reading the
 * CSS gate instead of asking this hook.
 */
export function usePortalState(): PortalStateValue {
  const value = useContext(PortalStateContext);
  if (!value) {
    throw new Error("usePortalState must be used inside PortalStateProvider");
  }
  return value;
}

export function PortalStateProvider({ children }: { children: ReactNode }) {
  const params = useSearchParams();

  const stateParam = params.get("state");
  const viewParam = params.get("view");

  // The funnel state is URL-only: it is a demo affordance, and persisting it
  // would leave a reviewer stuck in whatever state they last looked at.
  const funnelState = stateParam
    ? toFunnelState(normaliseStateParam(stateParam))
    : DEFAULT_FUNNEL_STATE;

  // `null` until the first client read — which on the server, and on the very
  // first paint, means the default. See the note on the store above.
  const storedTier = useSyncExternalStore(
    subscribeToStoredTier,
    readStoredTier,
    readStoredTierOnServer,
  );

  // A density arriving by deep link becomes the saved choice, so following a
  // `?view=pro` link once does not leave the owner back on Essentials next
  // time. WRITING to an external system is what an effect is for, and this one
  // sets no React state, so it cascades nothing.
  useEffect(() => {
    if (!viewParam) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.viewTier, toViewTier(viewParam));
    } catch {
      // Nothing to do: the URL is already carrying the choice for this visit.
    }
  }, [viewParam]);

  // Clause 5: a deep link beats the saved choice; the saved choice beats the
  // default. `toViewTier` narrows a stored string that is missing or stale.
  const viewTier = viewParam
    ? toViewTier(viewParam)
    : storedTier
      ? toViewTier(storedTier)
      : DEFAULT_VIEW_TIER;

  return (
    <PortalRoot funnelState={funnelState} viewTier={viewTier}>
      {children}
    </PortalRoot>
  );
}

/**
 * The root element and the context, together.
 *
 * KEEPING THEM IN ONE COMPONENT is the fix for a real bug, not tidiness. An
 * earlier Suspense fallback rendered the portal shell inside a bare `<div>` with
 * no provider above it, so the first render of `PortalSideNav` called
 * `usePortalState`, found no context and threw — a 500 on the initial request,
 * and the page only looked fine because the other branch took over once Suspense
 * resolved. There is one way in now, and it cannot be assembled wrongly.
 */
function PortalRoot({
  funnelState,
  viewTier,
  children,
}: {
  funnelState: FunnelState;
  viewTier: ViewTier;
  children: ReactNode;
}) {
  const value = useMemo<PortalStateValue>(
    () => ({ funnelState, viewTier, access: stateAccess(funnelState) }),
    [funnelState, viewTier],
  );

  return (
    <PortalStateContext.Provider value={value}>
      {/* `mv-portal` is what scopes every rule in `portal.css`; the two gating
          classes beside it are the whole state machine. */}
      <div
        className={`mv-portal ${FUNNEL_STATE_CLASS[funnelState]} ${viewTierClasses(viewTier)}`}
        data-funnel-state={funnelState}
        data-view-tier={viewTier}
      >
        {children}
      </div>
    </PortalStateContext.Provider>
  );
}
