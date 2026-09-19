"use client";

import { ChevronDown, Check, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * THE TOOLBAR'S DROPDOWN — the portal's own, not the operating system's.
 *
 * ── WHY THIS REPLACED A NATIVE `<select>` ──
 *
 * It was a native select on purpose, and the reasoning it carried is worth
 * keeping in view because this gives some of it up: a native select brings
 * correct keyboard handling, correct screen-reader semantics and the platform's
 * own picker on a phone, all for free.
 *
 * What it cannot bring is a styled LIST. A `<select>`'s popup is drawn by the
 * operating system — on Windows a white box with a blue highlight bar and no
 * radius, no spacing and no tick — so the row read as five designed controls
 * that each opened something belonging to a different application. Asked for
 * (2026-09-17) after seeing exactly that.
 *
 * ── SO THE SEMANTICS ARE REBUILT, NOT DROPPED ──
 *
 * This is the ARIA combobox-with-listbox pattern, which is what a native select
 * exposes anyway:
 *
 *   the trigger is `role="combobox"`, `aria-haspopup="listbox"`,
 *   `aria-expanded`, and is labelled by the field's own label;
 *   the panel is `role="listbox"`, each row `role="option"` with
 *   `aria-selected`;
 *   the ACTIVE row is tracked with `aria-activedescendant` while DOM focus
 *   stays on the listbox — the pattern's own arrangement, and the reason a
 *   screen reader announces each option as the reader arrows through it.
 *
 * Every key a select answers is answered here: Enter, Space, ArrowUp and
 * ArrowDown open it; arrows move; Home and End jump; Enter and Space choose;
 * Escape and Tab close; and typing a letter jumps to the next option starting
 * with it, which is the one select behaviour people use without knowing they
 * use it.
 *
 * ── THE PANEL IS PORTALLED, AND IT HAS TO BE ──
 *
 * `LeaseListPanel` wraps the toolbar in `<Card className="overflow-hidden">`,
 * which is load-bearing: the table runs to the card's edges and that is what
 * clips its square corners to the card's rounded ones. An absolutely positioned
 * panel inside it is clipped by the same rule — the dropdown opened and was cut
 * off at the bottom of the card, which is what a reader sees as "half a menu".
 *
 * So the panel renders into `document.body` and is positioned with `fixed`
 * against the trigger's own rectangle, re-measured on scroll and on resize
 * while it is open. Nothing about the card changes, and no ancestor can clip
 * the panel again.
 *
 * IT ALSO FLIPS. If there is less room under the trigger than above it, the
 * panel opens upward — otherwise a filter near the bottom of the window opens
 * into a 40px sliver.
 *
 * ── THE TOUCH COST, STATED ──
 *
 * On a phone this is now a panel rather than the OS wheel. The rows are 40px,
 * which is the platform minimum for a touch target, and the panel scrolls
 * rather than growing past the screen — so a long county list behaves. It is
 * still not the native picker, and that is the trade this change makes.
 */

export interface SelectOption {
  value: string;
  label: string;
  /** Shown, unselectable — the "order you reached by clicking a heading". */
  disabled?: boolean;
}

export function LeaseSelect({
  label,
  value,
  options,
  onChange,
  block = false,
  clearTo,
}: {
  /** The accessible name. Rendered visibly only by the caller, if at all. */
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (next: string) => void;
  /** Fill the width of its container — the five filter fields do. */
  block?: boolean;
  /**
   * What "cleared" means for this control, when it can be cleared at all.
   *
   * THE FIVE FILTERS PASS `""` — their "All counties" option — and get a ✕ on
   * the trigger once something else is chosen. Sort by and Show per page pass
   * nothing: every value they hold is a real answer, so there is no empty state
   * to return to and a ✕ would be a control that does not mean anything.
   */
  clearTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const base = useId();
  const listId = `${base}-list`;
  const labelId = `${base}-label`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  /* Clearable only when the caller says what cleared MEANS and the control is
     not already there — a ✕ on "All counties" would undo nothing. */
  const clearable = clearTo !== undefined && value !== clearTo;

  /* WHERE THE PANEL GOES, in viewport coordinates, because it is `fixed` in the
     body rather than absolute in the card — see the note above. Anchored to the
     bottom edge of the trigger, or to its top when there is more room up than
     down, and capped so it never runs past either edge of the window. */
  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const flip = below < 180 && above > below;
    setBox({
      left: r.left,
      width: r.width,
      ...(flip
        ? { bottom: window.innerHeight - r.top + 4 }
        : { top: r.bottom + 4 }),
      maxHeight: Math.max(120, Math.min(280, flip ? above : below)),
    });
  }, []);

  /* CLOSE ON ANYTHING THAT IS NOT THIS CONTROL, and follow the trigger while it
     is open. `pointerdown` and not `click`, so the panel is gone before
     whatever was clicked underneath reacts — and the panel itself counts as
     "this control" even though it is in the body now. */
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !wrapper.current?.contains(target) &&
        !list.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    /* `true` — capture — so a scrolling ANCESTOR moves the panel too, not just
       the window. A panel that stays put while the page scrolls under it is
       worse than one that closes. */
    const onMove = () => place();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  /* FOCUS MOVES INTO THE PANEL when it opens. Only the focus call is in an
     effect — it has to run after the list exists. The active row is set by
     `openPanel` below, at the moment of the click or the keypress, because a
     `setActive` here would be a synchronous state write inside an effect: an
     extra render every open, and what `react-hooks/set-state-in-effect` is
     pointing at. */
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
  }, [open]);

  /* Keep the active row in view when it moves past the panel's edge. */
  useEffect(() => {
    if (!open) return;
    const node = document.getElementById(`${base}-opt-${active}`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, active, base]);

  /* THE ACTIVE ROW STARTS ON THE CURRENT VALUE rather than at the top —
     arrowing from a selection is what a select does, and starting at the top
     would make the first ArrowDown skip the reader past what they already had. */
  const openPanel = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    place();
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
  };

  /** The next option whose label starts with `key` — a select's typeahead. */
  const jumpTo = (key: string) => {
    const lower = key.toLowerCase();
    const order = [
      ...options.slice(active + 1),
      ...options.slice(0, active + 1),
    ];
    const hit = order.find(
      (option) =>
        !option.disabled && option.label.toLowerCase().startsWith(lower),
    );
    if (hit) setActive(options.indexOf(hit));
  };

  const move = (delta: number) => {
    const last = options.length - 1;
    let next = active;
    for (let step = 0; step <= last; step += 1) {
      next = Math.min(last, Math.max(0, next + delta));
      if (!options[next]?.disabled) break;
      if (next === 0 || next === last) break;
    }
    setActive(next);
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          jumpTo(event.key);
        }
    }
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openPanel();
    }
  };

  return (
    <div ref={wrapper} className={`relative ${block ? "w-full" : ""}`}>
      <span id={labelId} className="sr-only">
        {label}
      </span>

      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${base}-value`}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={onTriggerKeyDown}
        className={`flex h-9 ${block ? "w-full" : ""} cursor-pointer items-center justify-between gap-2 rounded-[9px] border bg-mv-card px-3 text-[13px] text-mv-ink transition-colors focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)] focus-visible:outline-none ${
          open ? "border-mv-green" : "border-mv-line hover:border-mv-green"
        }`}
      >
        <span id={`${base}-value`} className="truncate">
          {selected?.label ?? ""}
        </span>
        {/* HIDDEN, NOT REMOVED, when the ✕ takes its place — the two occupy the
            same 16px, and removing it from the flow would shift the label right
            by that much the moment a filter is applied. */}
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-none text-mv-muted transition-transform ${open ? "rotate-180" : ""} ${clearable ? "invisible" : ""}`}
        />
      </button>

      {/* ── CLEAR THIS ONE FILTER ──

          OUTSIDE THE TRIGGER AND DRAWN OVER IT. A `<button>` cannot contain
          another `<button>` — it is invalid, and a screen reader is told about
          one control where there are two. So it is a sibling, positioned on top
          of the chevron it replaces, which keeps the trigger a single clean
          combobox and still puts the ✕ where the eye expects it.

          "Clear all" in the filter row resets every field at once; this resets
          the one the reader is looking at, which is what they want after
          narrowing by county and wanting the county back. */}
      {clearable && (
        <button
          type="button"
          aria-label={`Clear ${label}`}
          onClick={() => {
            onChange(clearTo as string);
            setOpen(false);
          }}
          className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-mv-muted transition-colors hover:bg-mv-portal-wash hover:text-mv-ink focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)] focus-visible:outline-none"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}

      {open &&
        box &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelId}
            aria-activedescendant={`${base}-opt-${active}`}
            onKeyDown={onListKeyDown}
            /* FIXED, IN THE BODY. The geometry comes from `place()` so it
               tracks the trigger; the width floor keeps it from coming out
               narrower than the control that opened it, and the ceiling keeps
               a long operator name from pushing it off a phone screen. */
            style={{
              position: "fixed",
              left: box.left,
              top: box.top,
              bottom: box.bottom,
              minWidth: box.width,
              maxHeight: box.maxHeight,
            }}
            className="z-[60] max-w-[min(calc(100vw-32px),320px)] overflow-y-auto rounded-[10px] border border-mv-line bg-mv-card p-1 shadow-mv-lg focus:outline-none"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === active;
              return (
                <li
                  key={option.value}
                  id={`${base}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onClick={() => choose(index)}
                  onPointerMove={() => !option.disabled && setActive(index)}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[7px] px-2.5 py-2 text-[13px] ${
                    option.disabled
                      ? "cursor-not-allowed text-mv-muted"
                      : isActive
                        ? "bg-mv-mint text-mv-green-ink"
                        : "text-mv-ink"
                  } ${isSelected ? "font-semibold" : ""}`}
                >
                  {/* THE TICK COLUMN IS ALWAYS THERE, on every row, so the
                      labels keep one left edge instead of shifting as the
                      selection moves — the same arrangement the demo state
                      menu uses. */}
                  <Check
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 flex-none ${isSelected ? "text-mv-green-deep" : "opacity-0"}`}
                  />
                  <span className="truncate">{option.label}</span>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
