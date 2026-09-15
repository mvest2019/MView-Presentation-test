"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { formatCompactDollars } from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { leaseReportPath } from "../../_lib/lease-routes";

/**
 * JUMP TO ANY LEASE ON THE RECORD.
 *
 * ── WHY THIS IS NOT A `<select>` ──
 *
 * It was one, and the list it dropped was the operating system's: one line of
 * plain text per lease, no room for the lease number and the county except run
 * together in the same string, no way to mark which one you are on beyond the
 * highlight, and a font and row height this page has no say over. `option`
 * elements take no markup — a browser renders them itself. So the only way to
 * show a reader what they are choosing between is to stop using one.
 *
 * ── WHAT THE LIST SHOWS NOW ──
 *
 * Each row is the lease's name, its number and county underneath, and its
 * MVestimate on the right — because a reader jumping between leases is almost
 * always looking for a particular one by size or by the number on a statement
 * in front of them, and the old list gave neither in a form you could scan.
 *
 * ── THE LIST IS EXACTLY AS WIDE AS THE BUTTON ──
 *
 * It was set to 420px, which is wider than the trigger and so hung out over the
 * dark band to its right: the panel looked unanchored, as though it belonged to
 * something else on the row. `w-full` against a wrapper that carries the same
 * 360px cap ties the two together, and the three columns inside each row —
 * name, number and county, figure — are laid out to fit that width rather than
 * to ask for more.
 *
 * ── IT IS A LISTBOX, WITH THE KEYBOARD A `<select>` GAVE FOR FREE ──
 *
 * Dropping the native control means re-earning what it did: Up/Down to move,
 * Home/End to jump, Enter to choose, Escape to leave, and the active row
 * announced through `aria-activedescendant` rather than by moving focus into
 * the list. The button itself is a `combobox`, which is what tells a screen
 * reader this thing opens.
 */
export function LeasePicker({ slug }: { slug: string }) {
  const router = useRouter();
  const listId = useId();

  const [open, setOpen] = useState(false);
  const current = leaseRecords.findIndex((entry) => entry.slug === slug);
  /** Which row the keyboard is on — not the chosen one until Enter. */
  const [active, setActive] = useState(Math.max(current, 0));

  const wrapper = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /* Close on a click anywhere else, and on Escape. A panel that can only be
     dismissed by hitting its own button is a panel people leave open. */
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent): void {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Keep the active row in view when the keyboard walks past the fold. */
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(index: number): void {
    setOpen(false);
    const next = leaseRecords[index];
    if (next && next.slug !== slug) router.push(leaseReportPath(next.slug));
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setActive(Math.max(current, 0));
        setOpen(true);
      }
      return;
    }

    const last = leaseRecords.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };

    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    }
  }

  const lease = leaseRecords[Math.max(current, 0)];

  return (
    <div ref={wrapper} className="relative w-full min-w-0 max-w-[360px]">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label="Jump to a lease"
        onClick={() => {
          setActive(Math.max(current, 0));
          setOpen((was) => !was);
        }}
        onKeyDown={onKeyDown}
        className="flex w-full cursor-pointer items-center gap-2 rounded-[9px] border border-mv-line bg-mv-card px-3 py-2 text-left text-[12.5px] font-medium text-mv-ink transition-colors hover:border-mv-green focus-visible:border-mv-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        <span className="min-w-0 flex-1 truncate">
          {lease.number ? `${lease.name} · Lease ${lease.number}` : lease.name}
          <span className="text-mv-muted"> — {lease.county}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-none text-mv-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Your leases"
          aria-activedescendant={`${listId}-${active}`}
          className="absolute z-30 mt-1.5 max-h-[320px] w-full overflow-y-auto rounded-mv border border-mv-line bg-mv-card py-1.5 shadow-mv-lg [scrollbar-color:var(--color-mv-line-strong)_var(--color-mv-bg)] [scrollbar-width:thin]"
        >
          {leaseRecords.map((entry, index) => {
            const selected = entry.slug === slug;
            return (
              <li
                key={entry.slug}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(index)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                  index === active ? "bg-mv-mint" : ""
                }`}
              >
                <Check
                  aria-hidden="true"
                  className={`h-4 w-4 flex-none ${
                    selected ? "text-mv-green-deep" : "text-transparent"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[12.5px] ${
                      selected ? "font-bold" : "font-semibold"
                    }`}
                  >
                    {entry.name}
                  </span>
                  <span className="block truncate text-[11px] text-mv-muted">
                    {entry.number ? `Lease ${entry.number}` : "no lease number"} ·{" "}
                    {entry.county}
                  </span>
                </span>
                <span className="flex-none text-[12px] font-semibold tabular-nums">
                  {formatCompactDollars(entry.mvestimate)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
