"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  fetchLeasePicker,
  LeasesApiError,
  type LeasePickerEntry,
} from "../../_api/leases-api";
import { formatCompactDollars } from "../../_lib/lease-format";
import { leaseReportPath, leaseRouteSlug } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";
import {
  isSampleSlug,
  routeSlugFor,
  sampleLeaseRecords,
} from "../../_lib/sample-leases";

/**
 * JUMP TO ANY LEASE ON THE RECORD.
 *
 * ── THE LIST IS THE SERVICE'S NOW, NOT THE FIXTURE'S ──
 *
 * `GET /api/v1/leases/picker` returns every lease the member owns as a name, a
 * number, a county and a figure — 782 of them on this record, in one unpaged
 * body. It used to drop the ten hand-written fixture leases, which is why the
 * counter beside it read "Lease 0 of 10" on a page whose heading named a lease
 * that was not among them: the fixture could not contain the lease being read,
 * so `findIndex` returned -1 and the +1 printed zero.
 *
 * ── IT IS A SEPARATE CALL FROM THE TABLE'S ──
 *
 * The table's `/leases` read is 79 paged requests carrying eighteen fields per
 * lease, because it sorts and filters on all of them. A header dropdown needs
 * five fields and needs them quickly, and this page does not render the table
 * at all — so it makes its own call rather than waiting on that one. See
 * `fetchLeasePicker`.
 *
 * ── THE COUNTER SAYS "782 LEASES" WHEN IT CANNOT SAY "3 OF 782" ──
 *
 * The lease being read is not always in the list: a report opened on a fixture
 * lease while a real record is signed in is exactly that case, and it is the
 * common one until the report body itself comes off the service. "Lease 0 of
 * 782" is a bug printed as a fact. The count alone is true either way, so that
 * is what it prints when the current lease cannot be placed — the dropdown
 * still works, and nothing on screen claims a position that does not exist.
 *
 * ── AN UNCLAIMED READER IS NOT SHOWN A REAL RECORD ──
 *
 * A sample slug means this page is the fictional twin an unclaimed visitor is
 * given, and its dropdown lists the ten sample leases WITHOUT making a request.
 * Fetching a real owner's 782 lease names to decorate a sample page would put
 * the record on screen for someone who has not claimed it.
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
 * Each row is the lease's name, its number and county underneath, and its
 * MVestimate on the right — because a reader jumping between leases is almost
 * always looking for a particular one by size or by the number on a statement
 * in front of them, and the old list gave neither in a form you could scan.
 *
 * ── IT IS A LISTBOX, WITH THE KEYBOARD A `<select>` GAVE FOR FREE ──
 *
 * Dropping the native control means re-earning what it did: Up/Down to move,
 * Home/End to jump, Enter to choose, Escape to leave, and the active row
 * announced through `aria-activedescendant` rather than by moving focus into
 * the list. The button itself is a `combobox`, which is what tells a screen
 * reader this thing opens.
 *
 * ── THE LIST IS EXACTLY AS WIDE AS THE BUTTON ──
 *
 * It was set to 420px, which is wider than the trigger and so hung out over the
 * dark band to its right: the panel looked unanchored, as though it belonged to
 * something else on the row. `w-full` against a wrapper that carries the same
 * 360px cap ties the two together.
 */

/** A row of the list: what it prints, what it is, and where it goes. */
interface PickerRow {
  /** The lease's own slug — compared against the page's to find the current one. */
  slug: string;
  /** Stable across a rename; two leases can share a name. */
  key: string;
  name: string;
  number: string | null;
  county: string;
  value: number;
  href: string;
}

type PickerState =
  | { status: "loading" }
  | { status: "ready"; rows: PickerRow[]; total: number }
  | { status: "error"; message: string };

/**
 * The ten sample leases as rows.
 *
 * `routeSlugFor` for the href and the sample slug for the identity, because a
 * sample slug is a data key and must never reach the address bar — the twin at
 * the same position is what a sample row opens. That is the module's rule
 * everywhere a sample lease is linked.
 */
function sampleRows(): PickerRow[] {
  return sampleLeaseRecords.map((record) => ({
    slug: record.slug,
    key: record.slug,
    name: record.name,
    number: record.number,
    county: record.county,
    value: record.mvestimate,
    href: leaseReportPath(routeSlugFor(record)),
  }));
}

/**
 * A served lease as a row.
 *
 * THE HREF IS BUILT THE SAME WAY THE TABLE BUILDS ITS OWN — `leaseRouteSlug`,
 * which is what `toLeaseRecord` gives every lease that arrives from `/leases`.
 * One URL shape for the module, whichever list a reader came from, and one the
 * report page can turn back into an `id` to fetch with.
 *
 * It was `leaseSlug`, which appends the name: this dropdown was still handing
 * out `02_269507-betty-kennedy-unit-a` after every other link in the module had
 * moved to the bare id.
 */
function servedRow(entry: LeasePickerEntry): PickerRow {
  const slug = leaseRouteSlug(entry.id, entry.number, entry.name);
  return {
    slug,
    key: entry.id || slug,
    name: entry.name,
    number: entry.number,
    county: entry.county,
    value: entry.value,
    href: leaseReportPath(slug),
  };
}

export function LeasePicker({ lease }: { lease: LeaseRecord }) {
  const router = useRouter();
  const listId = useId();

  /* WHICH SET THIS PAGE BELONGS TO, decided from the slug rather than from a
     prop, so a sample page cannot be handed the real record by a caller that
     forgot. See the note above. */
  const sample = isSampleSlug(lease.slug);

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PickerState>(() =>
    sample
      ? {
          status: "ready",
          rows: sampleRows(),
          total: sampleLeaseRecords.length,
        }
      : { status: "loading" },
  );

  useEffect(() => {
    if (sample) return;

    /* NO `setState({ loading })` HERE — the initial state above already is
       loading for a claimed page, and re-asserting it inside the effect is a
       synchronous set during render that buys a second pass for nothing. */
    const controller = new AbortController();

    fetchLeasePicker(controller.signal)
      .then((picker) =>
        setState({
          status: "ready",
          rows: picker.leases.map(servedRow),
          total: picker.total,
        }),
      )
      .catch((error: unknown) => {
        /* Our own unmount, not an outage — `request` re-throws the caller's
           abort untouched precisely so this can tell them apart. */
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof LeasesApiError
              ? error.message
              : "Could not load your leases.",
        });
      });

    return () => controller.abort();
  }, [sample]);

  const rows = state.status === "ready" ? state.rows : [];
  const current = rows.findIndex((row) => row.slug === lease.slug);

  /** Which row the keyboard is on — not the chosen one until Enter. */
  const [active, setActive] = useState(0);

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

  /* Keep the active row in view when the keyboard walks past the fold — and on
     opening, which is what carries a reader four hundred rows down to their own
     lease instead of starting them at the top of somebody else's. */
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(index: number): void {
    setOpen(false);
    const next = rows[index];
    if (next && next.slug !== lease.slug) router.push(next.href);
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

    const last = rows.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: Math.max(last, 0),
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

  return (
    <>
      {/* THE COUNTER READS OFF THE SAME LIST THE DROPDOWN DROPS, which is the
          whole reason it moved in here from the header: they were two reads of
          two different records, and the disagreement showed as "Lease 0 of
          10". */}
      <span className="text-[11px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {state.status === "loading" && "Loading your leases…"}
        {state.status === "error" && "Your leases"}
        {state.status === "ready" &&
          (current >= 0
            ? `Lease ${current + 1} of ${state.total.toLocaleString("en-US")}`
            : `${state.total.toLocaleString("en-US")} leases`)}
      </span>

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
          {/* THE LEASE THE PAGE IS ABOUT, from the page's own record rather than
              from the list. The button therefore reads correctly while the list
              is still loading, and it cannot name a different lease from the
              heading three lines above it — which is precisely what it did when
              it looked itself up in a fixture it was not in. */}
          <span className="min-w-0 flex-1 truncate">
            {lease.number
              ? `${lease.name} · Lease ${lease.number}`
              : lease.name}
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
            aria-activedescendant={
              state.status === "ready" && rows.length > 0
                ? `${listId}-${active}`
                : undefined
            }
            aria-busy={state.status === "loading"}
            className="absolute z-30 mt-1.5 max-h-[320px] w-full overflow-y-auto rounded-mv border border-mv-line bg-mv-card py-1.5 shadow-mv-lg [scrollbar-color:var(--color-mv-line-strong)_var(--color-mv-bg)] [scrollbar-width:thin]"
          >
            {/* THE THREE ANSWERS A CALL CAN GIVE, all three rendered. A dropdown
                that opens on nothing while a request is in flight reads as a
                broken control, and one that opens on nothing after a failure
                reads as an owner with no leases. */}
            {state.status === "loading" && (
              <li className="px-3 py-2.5 text-[12px] text-mv-muted">
                Loading your leases…
              </li>
            )}

            {state.status === "error" && (
              <li className="px-3 py-2.5 text-[12px] text-mv-muted">
                {state.message}
              </li>
            )}

            {state.status === "ready" && rows.length === 0 && (
              <li className="px-3 py-2.5 text-[12px] text-mv-muted">
                No leases on this record.
              </li>
            )}

            {rows.map((entry, index) => {
              const selected = entry.slug === lease.slug;
              return (
                <li
                  key={entry.key}
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
                      {entry.number
                        ? `Lease ${entry.number}`
                        : "no lease number"}{" "}
                      · {entry.county}
                    </span>
                  </span>
                  <span className="flex-none text-[12px] font-semibold tabular-nums">
                    {formatCompactDollars(entry.value)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
