"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { LeaseChoice } from "../_api/invite-api";
import { StepCard } from "./step-card";

/**
 * STEP 1 · WHICH LEASE.
 *
 * ── IT WAS A `<select>`, AND THE NATIVE POPUP WAS THE PROBLEM ──
 *
 * One choice out of a hundred options, so a native control was the obvious
 * thing and it is what this card shipped. Four defects came back off it, and
 * every one of them is a property of the popup rather than of the page:
 *
 *   IT LEFT THE PAGE. A hundred rows of native listbox is taller than the
 *   viewport, so the browser flipped it upwards and drew it over the chrome
 *   and off the top of the window. Defect sheet row 1.
 *
 *   IT COVERED THE SEARCH BOX. The one control the reader needs while the
 *   list is open — the type-ahead that reaches past page one — sat directly
 *   above the select and the popup landed on top of it. Row 5.
 *
 *   THE SEARCH DID NOT SHOW IN IT. The results arrived, the popup was already
 *   open over them, and nothing about the closed control said the option list
 *   had changed. Row 10.
 *
 *   IT CAME UP ALREADY ANSWERED. A `<select>` cannot be empty, so the first
 *   lease of the first page was the answer to a question nobody had been
 *   asked. Row 6.
 *
 * ── SO IT IS ONE COMBOBOX, AND THE SEARCH LIVES INSIDE IT ──
 *
 * A button that says which lease is chosen, and a panel under it holding the
 * search box and the results. The panel is absolutely positioned inside this
 * card with its own `max-height`, so it cannot leave the page and there is no
 * longer a separate box for it to cover — the search IS the top of the list.
 * Typing re-fills the rows under it, which is what "show the resulted info in
 * the dropdown" asks for.
 *
 * NOTHING IS CHOSEN UNTIL THE READER CHOOSES IT. The button reads "Select a
 * lease" and the facts strip below holds its place with a line saying so; step
 * 2 says the same. That is the honest state of the page on arrival, and it is
 * what row 6 asked for.
 *
 * ── THE OPTIONS ARE `NAME (NUMBER)` ──
 *
 * The service's own label is `NAME · Lease 15203`; QA asked for the word
 * "Lease" out and the number in brackets. The composition is in the API layer
 * so the closed button and the open list cannot drift — see `leaseLabel`.
 * Row 2.
 *
 * ── AND THE COUNT SAYS WHICH COUNT IT IS ──
 *
 * "4,461 leases on your record" over a list of a hundred read as a list that
 * had lost four thousand rows. The panel's own foot now names both figures and
 * what to do about the gap: the page is the first hundred, the search reaches
 * all of them. Row 3.
 */

/** `0.05138` → `5.138%` — a decimal in, never a percentage in. */
function formatInterest(decimal: number | null): string {
  if (decimal === null) return "not filed";
  const percent = decimal * 100;
  /* Small royalty shares live in the third and fourth decimal place; a large
     working share does not need them. */
  return `${Number(percent.toFixed(percent < 1 ? 4 : 2))}%`;
}

/** `4461` → `4,461`. Four digits of leases are hard to read unbroken. */
function group(n: number): string {
  return n.toLocaleString("en-US");
}

export function LeaseStep({
  leases,
  total,
  lease,
  peopleCount,
  leaseQuery,
  onLeaseQuery,
  searching,
  onChange,
}: {
  /** The options on offer right now — page one, or the search's answer. */
  leases: LeaseChoice[];
  /** Every claimed lease, even the ones past this page of the list. */
  total: number;
  /** NULL UNTIL THE READER PICKS ONE. See the header. */
  lease: LeaseChoice | null;
  /** Individuals on the chosen lease, or null while the roll is being read. */
  peopleCount: number | null;
  /** The type-ahead — matched server-side against ALL claimed leases. */
  leaseQuery: string;
  onLeaseQuery: (next: string) => void;
  searching: boolean;
  onChange: (leaseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  /* The row the keyboard is on. It is an index into `options` and is reset
     every time the list under it changes, because a row number names a
     different lease the moment the search answers. */
  const [at, setAt] = useState(0);

  const wrap = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  /* THE SELECTION SURVIVES THE SEARCH. The option list is whatever the
     type-ahead answered, and the chosen lease may match none of it — so it is
     pinned on top whenever the list lost it, and the reader can always see
     what they are about to replace. */
  const options = useMemo(() => {
    if (!lease) return leases;
    return leases.some((option) => option.leaseId === lease.leaseId)
      ? leases
      : [lease, ...leases];
  }, [leases, lease]);

  /* THE CURSOR GOES BACK TO THE TOP WHEN THE LIST UNDER IT CHANGES, and it is
     adjusted DURING RENDER rather than in an effect: an effect would paint one
     frame with the cursor on a row that is now a different lease, and setState
     in an effect body cascades. This is React's own "adjusting state when a
     prop changes" pattern. */
  const [listed, setListed] = useState(options);
  if (listed !== options) {
    setListed(options);
    setAt(0);
  }

  /* ---- closing: a click outside, or Escape ------------------------------- */
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* The search box takes focus with the panel: opening a list of four thousand
     and then asking the reader to click into the box to narrow it is one click
     too many. */
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  const pick = (leaseId: string) => {
    onChange(leaseId);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!options.length) return;
      setAt((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        return (next + options.length) % options.length;
      });
      return;
    }
    if (event.key === "Enter" && options[at]) {
      event.preventDefault();
      pick(options[at].leaseId);
    }
  };

  const searched = leaseQuery.trim().length > 0;

  return (
    <StepCard
      n={1}
      title="Select a Lease"
      action={
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {group(total)} {total === 1 ? "lease" : "leases"} on your record
        </span>
      }
    >
      <div className="iv-combo" ref={wrap}>
        <span className="iv-lbl">Lease</span>
        <button
          type="button"
          className={`iv-combo-btn${lease ? "" : " empty"}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen((was) => !was)}
          onKeyDown={(event) => {
            if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span>{lease ? lease.label : "Select a lease"}</span>
          <i aria-hidden="true">▾</i>
        </button>

        {open ? (
          <div className="iv-combo-pop" onKeyDown={onKeyDown}>
            <div className="iv-combo-find">
              <input
                ref={field}
                type="search"
                value={leaseQuery}
                onChange={(event) => onLeaseQuery(event.target.value)}
                placeholder={
                  total > leases.length
                    ? `Search all ${group(total)} leases — a name, number or county`
                    : "Search your leases — a name, number or county"
                }
                aria-label="Search your claimed leases"
              />
              {searching ? <span className="tiny muted">searching…</span> : null}
            </div>

            <ul className="iv-combo-list" id={listId} role="listbox">
              {options.map((option, index) => (
                <li key={option.leaseId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.leaseId === lease?.leaseId}
                    className={[
                      option.leaseId === lease?.leaseId ? "on" : "",
                      index === at ? "at" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={() => setAt(index)}
                    onClick={() => pick(option.leaseId)}
                  >
                    <b>{option.label}</b>
                    {option.counties.length ? (
                      <i>{option.counties.join(", ")}</i>
                    ) : null}
                  </button>
                </li>
              ))}
              {options.length === 0 ? (
                <li className="iv-combo-none tiny muted">
                  {searching
                    ? "Searching…"
                    : "No lease on your record matches that."}
                </li>
              ) : null}
            </ul>

            {/* BOTH FIGURES, AND WHAT TO DO ABOUT THE GAP — see the header. */}
            {total > leases.length || searched ? (
              <p className="iv-combo-foot tiny muted">
                {searched
                  ? `${group(leases.length)} of ${group(total)} ${
                      leases.length === 1 ? "lease matches" : "leases match"
                    }.`
                  : `Showing the first ${group(leases.length)} of ${group(
                      total,
                    )} — type above to search them all.`}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {lease ? (
        <dl className="iv-facts">
          {(
            [
              /* A lease straddling a county line is claimed once per county;
                 all of them scope the roll read, so all of them are named. */
              ["County", lease.counties.join(", ") || "—"],
              ["Lease number", lease.leaseNumber ?? "—"],
              ["Your interest", formatInterest(lease.decimalInterest)],
              /* An ellipsis, not a zero, while the roll is still being read —
                 "0 people" is an answer, and it is not yet this one. */
              [
                "Co-owners to invite",
                peopleCount === null ? "…" : String(peopleCount),
              ],
            ] as [string, string][]
          ).map(([term, value]) => (
            <div key={term}>
              <dt>
                <span>{term}</span>
              </dt>
              <dd style={{ margin: 0 }}>
                <strong>{value}</strong>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="tiny muted" style={{ margin: "12px 0 0" }}>
          Choose a lease and Mineral View reads the county appraisal roll for
          it — the other owners of record, their share, and where the roll
          posts to.
        </p>
      )}
    </StepCard>
  );
}
