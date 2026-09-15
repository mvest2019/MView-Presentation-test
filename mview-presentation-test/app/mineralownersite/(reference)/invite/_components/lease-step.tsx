"use client";

/* THE ONLY LINE IN THIS COMPONENT THE MOVE TOUCHED. My Leases is in the
   other route group now, and `(portal)`/`(reference)` are real directories
   even though the router treats them as invisible — so this reaches across
   with the `@/` alias rather than a relative climb that has to count them. */
import { formatCompactDollars } from "@/app/mineralownersite/(portal)/leases/_lib/lease-format";
import { peopleOn } from "../_lib/invite-records";
import type { InviteLease } from "../_lib/invite-types";
import { StepCard } from "./step-card";

/**
 * STEP 1 · WHICH LEASE.
 *
 * ── A `<select>`, NOT A LIST OF CARDS ──
 *
 * Ten leases, one choice, and the choice is not the interesting part of the
 * page — the people are. A card grid for ten near-identical unit names would
 * take a screen to say what one control says in a line, and push step 2 below
 * the fold on a laptop.
 *
 * ── EACH OPTION CARRIES ITS OWN HEADCOUNT ──
 *
 * "MCCABE ETAL GU · Lease 290271 — 20 people you could invite". Without it the
 * reader picks by name, finds two people on the roll, and has to go back and
 * try another; with it the choice is made once. The count is INDIVIDUALS, not
 * rows — a unit with fifteen owners of which eleven are LLCs is not a unit with
 * fifteen cousins on it.
 *
 * ── THE FOUR FACTS BELOW ARE THE DESIGN'S OWN ──
 *
 * County, lease number, what the reader's share is worth, and how many people
 * are on it. The money is here because it is the honest answer to "is this one
 * worth the conversation" — a lease worth $11,800 and a lease worth $1.36M
 * deserve different amounts of a reader's evening.
 *
 * ── WHAT THE RE-SKIN CHANGED ──
 *
 * `SelectField` and a Tailwind `<dl>` grid became `.iv-sel` and `.iv-facts`,
 * which are the reference's own. The facts strip is the visible difference: it
 * was four tinted boxes with rounded corners, and it is four columns divided by
 * hairlines now, reflowing to two on a narrow card. Nothing about what it says
 * changed, and `<dl>`/`<dt>`/`<dd>` are kept — `.iv-facts` addresses its
 * children by position and by element, so the list semantics cost nothing.
 */
export function LeaseStep({
  leases,
  lease,
  onChange,
}: {
  leases: InviteLease[];
  lease: InviteLease;
  onChange: (leaseId: string) => void;
}) {
  const people = peopleOn(lease);

  return (
    <StepCard
      n={1}
      title="Pick a lease"
      action={
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          {leases.length} on your record
        </span>
      }
    >
      <label className="iv-sel">
        <span>Lease</span>
        <select
          value={lease.leaseId}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Which lease to invite the co-owners of"
        >
          {leases.map((option) => {
            const count = peopleOn(option);
            return (
              <option key={option.leaseId} value={option.leaseId}>
                {option.label} — {count} {count === 1 ? "person" : "people"} you
                could invite
              </option>
            );
          })}
        </select>
      </label>

      <dl className="iv-facts">
        {(
          [
            ["County", lease.county],
            /* AN EM DASH FOR THE TWO UNNUMBERED UNITS, which is the
               reference's own answer here. "Unnumbered unit" was this build's,
               and it restates the row's own label back at the reader in the
               one cell that is meant to hold a number. */
            ["Lease number", lease.leaseNumber ?? "—"],
            ["Worth to you", formatCompactDollars(lease.ownerValue)],
            ["People to invite", String(people)],
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
