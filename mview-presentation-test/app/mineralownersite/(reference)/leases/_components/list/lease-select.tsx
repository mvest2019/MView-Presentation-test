"use client";

import { ChevronDown, Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
}: {
  /** The accessible name. Rendered visibly only by the caller, if at all. */
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (next: string) => void;
  /** Fill the width of its container — the five filter fields do. */
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const base = useId();
  const listId = `${base}-list`;
  const labelId = `${base}-label`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  /* CLOSE ON ANYTHING THAT IS NOT THIS CONTROL. `pointerdown` and not `click`,
     so the panel is gone before whatever was clicked underneath reacts. */
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

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
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-none text-mv-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${base}-opt-${active}`}
          onKeyDown={onListKeyDown}
          /* BOUNDED ON BOTH AXES, which is what keeps it on a phone screen.
             `min-w-full` so it never comes out narrower than the control that
             opened it; `max-w` so a long operator name cannot push it past the
             right edge — 100vw less the body's own gutters is the widest it can
             be anywhere, and it wraps rather than overflowing; `max-h` with
             scroll so a long county list is a scrolling panel instead of one
             that runs off the bottom. */
          className="absolute top-[calc(100%+4px)] left-0 z-30 max-h-[280px] max-w-[min(calc(100vw-32px),320px)] min-w-full overflow-y-auto rounded-[10px] border border-mv-line bg-mv-card p-1 shadow-mv-lg focus:outline-none"
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
                {/* THE TICK COLUMN IS ALWAYS THERE, on every row, so the labels
                    keep one left edge instead of shifting as the selection
                    moves — the same arrangement the demo state menu uses. */}
                <Check
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 flex-none ${isSelected ? "text-mv-green-deep" : "opacity-0"}`}
                />
                <span className="truncate">{option.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
