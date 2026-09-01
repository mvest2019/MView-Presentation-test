"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { usePortalState } from "./portal-state-provider";
import {
  FUNNEL_LABEL,
  FUNNEL_PLAN,
  FUNNEL_STATES,
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

  function hrefFor(state: string): string {
    const next = new URLSearchParams(params.toString());
    next.set("state", state);
    return `${pathname}?${next.toString()}`;
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
            <Link
              key={state}
              href={hrefFor(state)}
              role="menuitemradio"
              aria-checked={current}
              onClick={() => setOpen(false)}
              scroll={false}
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
