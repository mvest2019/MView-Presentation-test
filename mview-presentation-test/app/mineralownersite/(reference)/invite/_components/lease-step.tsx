"use client";

import type { LeaseChoice } from "../_api/invite-api";
import { StepCard } from "./step-card";

/**
 * STEP 1 · WHICH LEASE.
 *
 * ── A `<select>`, NOT A LIST OF CARDS ──
 *
 * One choice, and the choice is not the interesting part of the page — the
 * people are. A card grid for near-identical unit names would take a screen to
 * say what one control says in a line, and push step 2 below the fold.
 *
 * ── THE OPTIONS ARE THE API'S OWN `label`, AS-IS ──
 *
 * The contract says the label is ready to render, and it is. The per-option
 * headcount the fixture build appended ("— 20 people you could invite") is
 * gone with the fixture: the leases list does not carry per-lease people
 * counts, and inventing them would mean reading every lease's roll up front —
 * the one thing the contract's paging exists to avoid. The count appears in
 * the facts strip below the moment the chosen lease's roll is read.
 *
 * ── THE FOUR FACTS CHANGED WITH THE DATA ──
 *
 * County and lease number stay. "Worth to you" was the fixture's own estimate
 * and the invite API carries no valuation, so the slot now shows the reader's
 * DECIMAL INTEREST — the share the roll actually files for them, which is the
 * other honest answer to "is this one worth the conversation". A null interest
 * renders as "not filed", never as 0%: the roll filing nothing is not the roll
 * filing zero.
 */

/** `0.05138` → `5.138%` — a decimal in, never a percentage in. */
function formatInterest(decimal: number | null): string {
  if (decimal === null) return "not filed";
  const percent = decimal * 100;
  /* Small royalty shares live in the third and fourth decimal place; a large
     working share does not need them. */
  return `${Number(percent.toFixed(percent < 1 ? 4 : 2))}%`;
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
  lease: LeaseChoice;
  /** Individuals on the chosen lease, or null while the roll is being read. */
  peopleCount: number | null;
  /** The type-ahead — matched server-side against ALL claimed leases. */
  leaseQuery: string;
  onLeaseQuery: (next: string) => void;
  searching: boolean;
  onChange: (leaseId: string) => void;
}) {
  /* THE SELECTION SURVIVES THE SEARCH. The option list is whatever the
     type-ahead answered, and the chosen lease may match none of it — a
     `<select>` whose value is missing from its options silently shows the
     first row, so the chosen lease is pinned on top whenever the list lost
     it. */
  const options = leases.some((option) => option.leaseId === lease.leaseId)
    ? leases
    : [lease, ...leases];

  return (
    <StepCard
      n={1}
      title="Pick a lease"
      action={
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {total} on your record
        </span>
      }
    >
      {total > leases.length ? (
        <div className="iv-find">
          <input
            type="search"
            value={leaseQuery}
            onChange={(event) => onLeaseQuery(event.target.value)}
            placeholder={`Search all ${total} leases — a name, number or county`}
            aria-label="Search your claimed leases"
          />
          {searching ? <span className="tiny muted">searching…</span> : null}
        </div>
      ) : null}

      <label className="iv-sel">
        <span>Lease</span>
        <select
          value={lease.leaseId}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Which lease to invite the co-owners of"
        >
          {options.map((option) => (
            <option key={option.leaseId} value={option.leaseId}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {total > leases.length ? (
        <p className="tiny muted" style={{ margin: "6px 0 0" }}>
          {leaseQuery.trim()
            ? `${leases.length} ${leases.length === 1 ? "lease matches" : "leases match"} — the dropdown holds the results.`
            : `The dropdown holds your first ${leases.length}; the search reaches all ${total}.`}
        </p>
      ) : null}

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
            ["People to invite", peopleCount === null ? "…" : String(peopleCount)],
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
    </StepCard>
  );
}
