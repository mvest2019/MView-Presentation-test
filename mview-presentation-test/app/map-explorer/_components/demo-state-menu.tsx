"use client";

/*
 * The owner funnel state, as a demo control on the map.
 *
 * The same five states the portal's top bar offers, with the same labels and
 * the same plan lines — `FUNNEL_STATES`, `FUNNEL_LABEL` and `FUNNEL_PLAN` in
 * `app/mineralownersite/_lib/portal-state.ts`. Declared again rather than
 * imported, like the view modes beside it: that module is the portal's own
 * state, tied to its provider and its stylesheet.
 *
 * THE TWO AXES ARE NOT THE SAME THING, which is the portal's most-repeated
 * warning and holds here too:
 *
 *   FUNNEL STATE  what the account IS, and therefore what it MAY see.
 *   VIEW MODE     how much of that the reader WANTS to see.
 *
 * So this does not hide map features itself. It sets the ceiling on the view
 * modes — a free account cannot read the map at Pro — and the mode picker
 * shows the rest locked, which is the whole point of a demo control: to see
 * the map as each kind of account sees it.
 */

import { Check, ChevronDown, Lock, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { type Density } from "./density-switch";

export const FUNNEL_STATES = [
  "unclaimed",
  "claimed",
  "trial",
  "lapsed",
  "paid",
] as const;

export type FunnelState = (typeof FUNNEL_STATES)[number];

/** The portal's default, and where a stored value that means nothing lands. */
export const DEFAULT_FUNNEL_STATE: FunnelState = "paid";

/** The button's label — the portal's `FUNNEL_LABEL`, verbatim. */
const FUNNEL_LABEL: Record<FunnelState, string> = {
  unclaimed: "Demo: not claimed",
  claimed: "Demo: free · claimed",
  trial: "Demo: Premium trial",
  lapsed: "Demo: trial ended",
  paid: "Demo: paid",
};

/** The option's own name, without the "Demo:" the button carries. */
const FUNNEL_NAME: Record<FunnelState, string> = {
  unclaimed: "not claimed",
  claimed: "free · claimed",
  trial: "Premium trial",
  lapsed: "trial ended",
  paid: "paid",
};

/** The plan each state is on — the portal's `FUNNEL_PLAN`, verbatim. */
const FUNNEL_PLAN: Record<FunnelState, string> = {
  unclaimed: "Free · no claim yet",
  claimed: "Free · record claimed",
  trial: "Premium trial · 4 days left",
  lapsed: "Free · trial ended",
  paid: "Premium plan",
};

/**
 * The furthest a state may read.
 *
 * Free accounts — before a claim, after one, and after a trial has run out —
 * get the two plain modes; a trial and a paid plan get all four. The mode
 * picker locks the rest rather than hiding them, so what a plan buys is
 * visible from inside the free view.
 */
export const FUNNEL_CEILING: Record<FunnelState, Density> = {
  unclaimed: "simple",
  claimed: "simple",
  trial: "pro",
  lapsed: "simple",
  paid: "pro",
};

const MENU_WIDTH = 244;

/** Reads a stored value back, falling back to the default. */
export function toFunnelState(value: string | null | undefined): FunnelState {
  return FUNNEL_STATES.includes(value as FunnelState)
    ? (value as FunnelState)
    : DEFAULT_FUNNEL_STATE;
}

export function DemoStateMenu({
  value,
  onChange,
}: {
  value: FunnelState;
  onChange: (state: FunnelState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState({ left: 0, top: 0 });
  const box = useRef<HTMLDivElement>(null);
  /*
   * The menu itself, which is NOT inside `box`.
   *
   * It is rendered through a portal on the body, so the dismissal check below
   * cannot ask the wrapper whether the click was inside it — every click on an
   * option counted as an outside click, shut the menu on `mousedown`, and the
   * option was gone before the click could land on it. The menu looked dead.
   */
  const menu = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  /* Measured and placed against the window — the toolbar pill blurs its
     backdrop, which makes it the containing block for anything `fixed` inside
     it, and it scrolls sideways. See `DensitySwitch`, which had to learn the
     same lesson. */
  function toggle() {
    const rect = button.current?.getBoundingClientRect();
    if (rect) {
      const room = document.documentElement.clientWidth;
      setAt({
        left: Math.max(8, Math.min(rect.left, room - MENU_WIDTH - 8)),
        top: rect.bottom + 6,
      });
    }
    setOpen((was) => !was);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (box.current?.contains(target) || menu.current?.contains(target)) {
        return;
      }
      setOpen(false);
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

  return (
    <div ref={box} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={FUNNEL_LABEL[value]}
        title="Demo control — see the map as each kind of account sees it"
        onClick={toggle}
        className={`inline-flex w-full shrink-0 cursor-pointer items-center gap-[6px] rounded-lg border border-mv-line bg-white px-[10px] py-[7px] text-[13px] font-semibold leading-tight text-mv-slate transition-colors hover:border-mv-green-deep hover:text-mv-green-deep lg:w-auto lg:py-[5px] lg:text-[12.5px] ${
          open ? "border-mv-green-deep text-mv-green-deep" : ""
        }`}
      >
        <UserRound size={14} strokeWidth={2} aria-hidden="true" />
        {FUNNEL_LABEL[value]}
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menu}
            role="listbox"
            aria-label="Owner funnel state"
            style={{ left: at.left, top: at.top, width: MENU_WIDTH }}
            className="pointer-events-auto fixed z-40 overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg"
          >
            <div className="px-[12px] pb-[6px] pt-[10px] text-[10px] font-extrabold uppercase leading-none tracking-[.12em] text-mv-muted">
              Owner funnel state
            </div>

            {FUNNEL_STATES.map((state) => {
              const selected = state === value;
              return (
                <button
                  key={state}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(state);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-start gap-[8px] px-[12px] py-[9px] text-left transition-colors hover:bg-[#f2f8f5] ${
                    selected ? "bg-[#f4faf6]" : ""
                  }`}
                >
                  <Check
                    size={14}
                    strokeWidth={3}
                    aria-hidden="true"
                    className={`mt-[2px] shrink-0 text-mv-green-deep ${
                      selected ? "" : "invisible"
                    }`}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] font-semibold leading-none ${
                        selected ? "text-mv-green-deep" : "text-mv-ink"
                      }`}
                    >
                      {FUNNEL_NAME[state]}
                    </span>
                    <span className="mt-[4px] flex items-center gap-[5px] text-[11.5px] leading-tight text-mv-muted">
                      {FUNNEL_CEILING[state] !== "pro" && (
                        <Lock size={11} strokeWidth={2.5} aria-hidden="true" />
                      )}
                      {FUNNEL_PLAN[state]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
