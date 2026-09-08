"use client";

import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/*
 * View modes: Ultra → Essentials → Detailed → Pro, simplest to fullest.
 *
 * The map's main control. Each mode is a floor, not a set: the map shows
 * everything its own mode and every mode below it carries, so a reader moves
 * from the bare minimum to the whole thing along one row of four.
 *
 * The order is the owner portal's — `VIEW_TIERS` in
 * `app/mineralownersite/_lib/portal-state.ts`, where Ultra is likewise the
 * simplest ("one headline, one status, one button") and Professional the
 * fullest. Declared again here rather than imported: that module is the
 * portal's own state, tied to its provider and its stylesheet, and the map
 * needs four labels and a ranking.
 *
 * "Pro" is the short form of Professional. It is a view mode here, never a
 * plan name.
 */

export const DENSITIES = ["ultra", "simple", "detailed", "pro"] as const;

export type Density = (typeof DENSITIES)[number];

/** Essentials is the product default: the basics, and nothing a reader has to
    dismiss before they can read them. */
export const DEFAULT_DENSITY: Density = "simple";

export const DENSITY_LABEL: Record<Density, string> = {
  ultra: "Ultra",
  simple: "Essentials",
  detailed: "Detailed",
  pro: "Pro",
};

const DENSITY_HINT: Record<Density, string> = {
  ultra: "Ultra — the map, the wells, and the least about each one",
  simple: "Essentials — the basic map information",
  detailed: "Detailed — operational detail as well",
  pro: "Pro — everything, including the analysis",
};

/* How the four rank, so a section can name the least density it belongs to
   rather than listing the ones it appears in. */
const DENSITY_RANK: Record<Density, number> = {
  ultra: 0,
  simple: 1,
  detailed: 2,
  pro: 3,
};

/** Whether `current` is detailed enough to show something that starts at `from`. */
export function showsAt(current: Density, from: Density): boolean {
  return DENSITY_RANK[current] >= DENSITY_RANK[from];
}

/** Reads a stored or shared value back, falling back to the default. */
export function toDensity(value: string | null | undefined): Density {
  return DENSITIES.includes(value as Density)
    ? (value as Density)
    : DEFAULT_DENSITY;
}

/** The menu's own width, which its placement has to know before it is drawn. */
const MENU_WIDTH = 236;

/** The one line each mode gets in the menu. */
const DENSITY_NOTE: Record<Density, string> = {
  ultra: "The map and the wells, and the least about each one",
  simple: "The basics: operator, status, lease and county",
  detailed: "Operational detail — depths, location, production history",
  pro: "Everything, including the tools, forecasts and analysis",
};

/**
 * The view-mode picker: one button naming the mode, four choices under it.
 *
 * A menu rather than four pills in a row. The pills sat beside the Map / Table
 * / Insights switch and read as a second set of tabs — two segmented controls
 * side by side, both looking like the thing that changes the page. One button
 * says what mode you are in and gets out of the way, which is what a setting
 * should do next to a navigation control.
 *
 * A listbox, not a tablist: it picks a value, it does not move between views.
 */
export function DensitySwitch({
  value,
  onChange,
}: {
  value: Density;
  onChange: (density: Density) => void;
}) {
  const [open, setOpen] = useState(false);
  /*
   * Where the menu hangs, in viewport pixels.
   *
   * Fixed rather than absolute, and measured off the button each time it
   * opens. The toolbar is a pill that scrolls sideways when the window is
   * narrow, and an absolutely positioned menu inside a scroller is clipped by
   * it — the menu was in the DOM, with a size, and invisible. The share menu
   * beside it is placed the same way, for the same reason.
   */
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

  function toggle() {
    const rect = button.current?.getBoundingClientRect();
    if (rect) {
      /* Held inside the window: the button sits at the left of the bar on a
         wide screen and near its right edge on a narrow one. */
      const room = document.documentElement.clientWidth;
      setAt({
        left: Math.max(8, Math.min(rect.left, room - MENU_WIDTH - 8)),
        top: rect.bottom + 6,
      });
    }
    setOpen((was) => !was);
  }

  /* Shut on a click anywhere else and on Escape — the map underneath is the
     usual next thing a reader touches, and a menu left standing over it takes
     the click. */
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
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`View mode: ${DENSITY_LABEL[value]}`}
        title={DENSITY_HINT[value]}
        ref={button}
        onClick={toggle}
        className={`inline-flex w-full shrink-0 cursor-pointer items-center gap-[6px] rounded-lg border border-mv-line bg-white px-[10px] py-[7px] text-[13px] font-semibold leading-tight text-mv-slate transition-colors hover:border-mv-green-deep hover:text-mv-green-deep lg:w-auto lg:py-[5px] lg:text-[12.5px] ${
          open ? "border-mv-green-deep text-mv-green-deep" : ""
        }`}
      >
        <SlidersHorizontal size={14} strokeWidth={2} aria-hidden="true" />
        {DENSITY_LABEL[value]}
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/*
        In a portal, on the body.
        
        The toolbar pill carries a `backdrop-blur`, which makes it the
        containing block for anything `fixed` inside it — and it also scrolls
        sideways, so the menu was clipped to the pill's own box and vanished
        while still being in the DOM with a size. Out here nothing can clip it.
      */}
      {open &&
        createPortal(
          <div
            ref={menu}
            role="listbox"
            aria-label="How much detail to show"
            /* Left-aligned under its own button, and above everything else on
             the bar — the toolbar scrolls sideways at narrow widths and a menu
             clipped by it would be half a menu. */
            style={{ left: at.left, top: at.top, width: MENU_WIDTH }}
            /* `pointer-events-auto`: the map's chrome layer is click-through by
             default and every control on it opts back in. Without it the menu
             was drawn but every click went past it into the map. */
            className="pointer-events-auto fixed z-40 overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg"
          >
            {DENSITIES.map((density) => {
              const selected = density === value;
              return (
                <button
                  key={density}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  title={DENSITY_HINT[density]}
                  onClick={() => {
                    onChange(density);
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
                      {DENSITY_LABEL[density]}
                    </span>
                    {/* What the mode actually gives you, so the choice is made
                      from the menu rather than by trying all four. */}
                    <span className="mt-[4px] block text-[11.5px] leading-tight text-mv-muted">
                      {DENSITY_NOTE[density]}
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
