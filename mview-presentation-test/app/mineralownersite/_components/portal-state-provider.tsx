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
  readViewTier,
  readViewTierOnServer,
  subscribeViewTier,
  writeViewTier,
} from "../_lib/view-tier-store";
import {
  DEFAULT_FUNNEL_STATE,
  DEFAULT_VIEW_TIER,
  FUNNEL_STATE_CLASS,
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
    subscribeViewTier,
    readViewTier,
    readViewTierOnServer,
  );

  // A density arriving by deep link becomes the saved choice, so following a
  // `?view=pro` link once does not leave the owner back on Essentials next
  // time. WRITING to an external system is what an effect is for, and this one
  // sets no React state, so it cascades nothing.
  useEffect(() => {
    if (!viewParam) return;
    /* THROUGH THE STORE, NOT `localStorage` DIRECTLY — the write has to notify
       this tab or the deep link would be saved and not shown. See
       `view-tier-store.ts`. */
    writeViewTier(toViewTier(viewParam));
  }, [viewParam]);

  /*
   * THE SAVED CHOICE IS READ FIRST, AND THE DEEP LINK STILL WINS. That reads
   * backwards, so: `?view=` is applied by the effect above, which SAVES it —
   * so by the time this line runs for a deep link the store already holds the
   * linked tier. Clause 5 is honoured through the store rather than around it.
   *
   * WHY IT MATTERS THAT THE PARAM IS NOT READ DIRECTLY HERE. The density switch
   * no longer navigates (see `view-tier-switch.tsx`), so a `?view=pro` left in
   * the address bar by an older link would otherwise out-rank every subsequent
   * click and pin the reader to one density with a control that appeared to do
   * nothing. The param seeds the store once; after that the store is the
   * answer.
   *
   * The param is still consulted on the FIRST render, before the effect has
   * run, so a cold deep link paints at the linked density rather than flashing
   * the stored one.
   */
  const viewTier = storedTier
    ? toViewTier(storedTier)
    : viewParam
      ? toViewTier(viewParam)
      : DEFAULT_VIEW_TIER;

  return (
    <PortalRoot funnelState={funnelState} viewTier={viewTier}>
      {children}
    </PortalRoot>
  );
}

/**
 * The root element and the context, given a state and a density.
 *
 * KEEP THE CONTEXT AND THE CLASSES TOGETHER, in one component, so a caller
 * cannot render the wrapper without the provider above it. That combination is
 * exactly what broke once: an earlier Suspense fallback rendered the portal
 * shell inside a bare `<div>` with no provider, so the first render of
 * `PortalSideNav` called `usePortalState`, found no context and threw — a 500 on
 * the initial request, and the page only looked fine because the other branch
 * took over when Suspense resolved. There is one way in now.
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
