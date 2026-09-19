"use client";

/**
 * THE CLAIMED LEASES, FETCHED ONCE AND READ TWICE.
 *
 * Two parts of the map need this answer: the rail lists the leases, and the
 * view frames the wells and draws them in place of the statewide bubbles.
 * `GET /api/v1/map/claimed-wells` is 831KB for the member it was built
 * against, so fetching it in both places would double that for nothing.
 *
 * ── WHY A CONTEXT AND NOT A PROP ──
 *
 * The rail is four levels below the view — view → chrome → filters panel →
 * this section — and the payload would have to be threaded through two
 * components that have no use for it. `memberId` is small enough to thread and
 * already is; this is not.
 *
 * ── LOADING IS A STATE THE MAP CARES ABOUT ──
 *
 * The view cannot decide how to open until this answers: with claims it frames
 * them, without it keeps the statewide view. So `status` is exposed rather
 * than just the data, and the view waits for `ready` before deciding. A map
 * that opens on Texas and jumps to a county a second later is worse than one
 * that opens a beat late in the right place.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getClaimedLeasesMap,
  type MapClaimedLeases,
  type MapWell,
} from "@/lib/map-api";

/** One shared empty array, so "nothing to draw" has a stable identity. */
const EMPTY_WELLS: MapWell[] = [];

export type ClaimedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: MapClaimedLeases }
  | { status: "failed"; message: string };

type ClaimedContext = {
  state: ClaimedState;
  /**
   * The reader has closed the claimed view.
   *
   * Session-scoped and deliberately not persisted: closing says "not right
   * now", not "never again". A reload brings the claim back, which is the way
   * back in — there is no second control to find.
   */
  dismissed: boolean;
  dismiss: () => void;
  /** Puts the claimed view back: frames the wells and draws them again. */
  restore: () => void;
  /**
   * The lease keys currently ticked, or `null` meaning "all of them".
   *
   * `null` RATHER THAN A FULL SET, and the difference matters: the claim can
   * be 782 leases, and seeding a Set with all of them means the untouched
   * default allocates and compares 782 strings on every render for a state
   * nobody has expressed. `null` is the honest value for "the reader has not
   * chosen", and it survives the leases arriving late without a sync effect.
   */
  selected: Set<string> | null;
  toggleLease: (leaseKey: string) => void;
};

const Ctx = createContext<ClaimedContext>({
  state: { status: "idle" },
  dismissed: false,
  dismiss: () => {},
  restore: () => {},
  selected: null,
  toggleLease: () => {},
});

export function ClaimedLeasesProvider({
  memberId,
  children,
}: {
  memberId: number | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<ClaimedState>(
    /* Signed out: there is nothing to ask about, and `idle` says that rather
       than pretending a request is in flight that never starts. */
    memberId === null ? { status: "idle" } : { status: "loading" },
  );

  /*
   * THE RESET IS DONE DURING RENDER, not in the effect.
   *
   * React's own pattern for adjusting state when an input changes, and the one
   * this project's `set-state-in-effect` rule leaves open. It also reads
   * better: switching member should blank the previous member's leases in the
   * same render that notices the switch, not one paint later with the old
   * owner's list still on screen.
   *
   * The effect below is then only the request, whose `then`/`catch` are
   * callbacks from an external system — which is what an effect is for.
   */
  const [lastMember, setLastMember] = useState(memberId);
  if (memberId !== lastMember) {
    setLastMember(memberId);
    setState(memberId === null ? { status: "idle" } : { status: "loading" });
  }

  useEffect(() => {
    if (memberId === null) return;

    let live = true;

    getClaimedLeasesMap(memberId)
      .then((data) => {
        if (live) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!live) return;
        /* The sentence belongs to whatever renders it; the exception belongs
           in the console. */
        console.error("[claimed-leases] load failed", error);
        setState({
          status: "failed",
          message: "Your leases could not be loaded. Try again in a moment.",
        });
      });

    /* The member can change under us — the portal's owner picker switches
       accounts without remounting the map — so a reply for the previous one
       must not land in this state. */
    return () => {
      live = false;
    };
  }, [memberId]);

  const [dismissed, setDismissed] = useState(false);

  /* A new member is a new claim, so a dismissal of the old one does not carry
     over — the render-time reset above is where the member change is noticed. */
  if (memberId !== lastMember && dismissed) setDismissed(false);

  const [selected, setSelected] = useState<Set<string> | null>(null);

  /* A new member is a new claim, so their choice does not carry over either. */
  if (memberId !== lastMember && selected !== null) setSelected(null);

  const toggleLease = useCallback(
    (leaseKey: string) => {
      setSelected((current) => {
        /* First touch: everything was on, so the set starts as every lease
           the claim holds, minus the one just turned off. Built here rather
           than up front because until now there was nothing to build it from
           and nothing to compare it against. */
        const base =
          current ??
          new Set(
            state.status === "ready"
              ? state.data.leases.map((lease) => lease.leaseKey)
              : [],
          );

        const next = new Set(base);
        if (next.has(leaseKey)) next.delete(leaseKey);
        else next.add(leaseKey);
        return next;
      });
    },
    [state],
  );

  const value = useMemo<ClaimedContext>(
    () => ({
      state,
      dismissed,
      dismiss: () => setDismissed(true),
      restore: () => setDismissed(false),
      selected,
      toggleLease,
    }),
    [state, dismissed, selected, toggleLease],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClaimed(): ClaimedState {
  return useContext(Ctx).state;
}

/** Whether the claimed view has been closed, and how to close it. */
export function useClaimedDismiss(): {
  dismissed: boolean;
  dismiss: () => void;
  restore: () => void;
} {
  const { dismissed, dismiss, restore } = useContext(Ctx);
  return { dismissed, dismiss, restore };
}

/**
 * Has this reader actually claimed anything?
 *
 * The one question most callers have, and the one that decides whether any
 * claimed-lease UI is drawn at all. False while loading, false on failure,
 * false for a member with an empty claim — in every one of those the map
 * behaves exactly as it did before this feature existed.
 */
export function useHasClaim(): boolean {
  const { state, dismissed } = useContext(Ctx);
  if (dismissed) return false;
  return state.status === "ready" && state.data.leases.length > 0;
}

/**
 * The claimed wells and the box around them, or `null` when there is no claim.
 *
 * Memoised on the state object so the view's effects do not re-run on every
 * render of the tree above them.
 */
/** Which leases are ticked, and how to tick one. */
export function useClaimedSelection(): {
  isSelected: (leaseKey: string) => boolean;
  toggleLease: (leaseKey: string) => void;
} {
  const { selected, toggleLease } = useContext(Ctx);
  return {
    /* `null` is "all", so an untouched list reads as fully ticked without a
       set having been built for it. */
    isSelected: (leaseKey: string) =>
      selected === null || selected.has(leaseKey),
    toggleLease,
  };
}

/**
 * The wells of the ticked leases.
 *
 * Unticking a lease takes its wells off the map; it does not move the camera.
 * Re-framing on every tick would walk the reader around the state while they
 * are trying to narrow what they are looking at.
 */
export function useClaimedWells(): MapWell[] {
  const { state, selected, dismissed } = useContext(Ctx);

  return useMemo(() => {
    if (dismissed || state.status !== "ready") return EMPTY_WELLS;
    if (selected === null) return state.data.wells;

    /* Deduplicated on the way out, not on the way in: a well filed under two
       ticked leases appears in both lists. */
    const seen = new Map<string, MapWell>();
    for (const [leaseKey, wells] of Object.entries(state.data.wellsByLease)) {
      if (!selected.has(leaseKey)) continue;
      for (const well of wells) if (!seen.has(well.api)) seen.set(well.api, well);
    }
    return [...seen.values()];
  }, [state, selected, dismissed]);
}

export function useClaimedFrame(): {
  wells: MapClaimedLeases["wells"];
  extent: MapClaimedLeases["extent"];
} | null {
  const state = useClaimed();

  return useMemo(() => {
    if (state.status !== "ready") return null;
    if (state.data.wells.length === 0) return null;
    return { wells: state.data.wells, extent: state.data.extent };
  }, [state]);
}
