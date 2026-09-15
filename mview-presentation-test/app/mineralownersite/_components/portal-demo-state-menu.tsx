"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { usePortalState } from "./portal-state-provider";
import { writeFunnelState } from "../_lib/funnel-state-store";
import {
  FUNNEL_LABEL,
  FUNNEL_PLAN,
  FUNNEL_STATES,
  type FunnelState,
} from "../_lib/portal-state";

/**
 * The top bar's demo control — pick any of the five owner funnel states.
 *
 * WHAT THIS REPLACES. The control was a one-step cycler: each click advanced to
 * the next state in funnel order, which is what the reference does
 * (`mvToggleClaimState` -> `mvCycleFunnelState`). That meant reaching `lapsed`
 * from `unclaimed` took three clicks with no way to see what the states were.
 * It is a dropdown now (requested), and every state is one click away.
 *
 * THE STATES THEMSELVES ARE UNTOUCHED — `FUNNEL_STATES` in funnel order,
 * `FUNNEL_LABEL` for the button, `FUNNEL_PLAN` for each option's sub-line. No
 * new state, no new key, no new wording.
 *
 * STILL LINKS, NOT CLICK HANDLERS. The funnel state is a URL parameter
 * (`?state=`), which is the reference's own deep-link contract, so each option
 * is an anchor to that URL. Picking a state stays bookmarkable and shareable,
 * Back steps through the states, and the provider needs no setter. Other
 * parameters are preserved, so switching state does not knock the reader out of
 * the density they were reading at.
 *
 * `menuitemradio` with `aria-checked`, because this is one-of-many. The tick is
 * `aria-hidden` — `aria-checked` is what a screen reader goes on, and the glyph
 * would otherwise be announced as content.
 */
export function PortalDemoStateMenu() {
  const { funnelState } = usePortalState();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Same dismissal contract as the account menu, so the two controls in this bar
  // do not behave like two different components.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /**
   * PICK A STATE WITHOUT TOUCHING THE URL.
   *
   * `writeFunnelState` sets the cookie the provider subscribes to, so every CSS
   * gate on the page flips immediately. `router.refresh()` then re-renders the
   * current route on the server, which is what re-reads the cookie and rebuilds
   * anything chosen server-side — the lease report's record, above all. It is a
   * refresh of this URL, NOT a navigation: the address bar does not move and no
   * history entry is added.
   *
   * A `?state=` already in the address bar would out-rank the cookie on the
   * next render, so it is stripped once on the way — that is the only URL write
   * this control ever does, and it REMOVES a parameter rather than adding one.
   */
  function choose(state: FunnelState): void {
    writeFunnelState(state);
    setOpen(false);

    if (params.get("state")) {
      const next = new URLSearchParams(params.toString());
      next.delete("state");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
      return;
    }
    router.refresh();
  }

  return (
    <div className="v41-avwrap" ref={wrap}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Prototype demo — switch between the five owner funnel states"
      >
        {FUNNEL_LABEL[funnelState]} ▾
      </button>

      <div
        className={`v41-avmenu mv-demo-menu ${open ? "open" : ""}`}
        role="menu"
        aria-label="Demo — owner funnel state"
      >
        <div className="v41-avsec">Owner funnel state</div>

        {FUNNEL_STATES.map((state) => {
          const current = state === funnelState;
          return (
            <button
              key={state}
              type="button"
              role="menuitemradio"
              aria-checked={current}
              onClick={() => choose(state)}
            >
              <span className="mv-demo-tick" aria-hidden="true">
                {current ? "✓" : ""}
              </span>
              <span className="mv-demo-text">
                {/* The button above already says "Demo", so the prefix on
                    `FUNNEL_LABEL` would repeat on all five rows. Stripped for
                    the options only — the wording underneath is the
                    reference's. */}
                <span>{FUNNEL_LABEL[state].replace(/^Demo:\s*/, "")}</span>
                {/* What the state actually means, in the reference's own words:
                    Free · no claim yet, Premium trial · 4 days left, and so on. */}
                <span className="mv-demo-plan">{FUNNEL_PLAN[state]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
