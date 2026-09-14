"use client";

import { Badge } from "../../../_components/ui/badge";
import { SelectField } from "../../../_components/ui/form-controls";
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
 * the fold on a laptop. It is also the control every filter in this repo
 * standardises on; see the note in `portal-ui.md` about why Radix Select was
 * turned down.
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
        <Badge tone="slate" size="xs">
          {leases.length} on your record
        </Badge>
      }
    >
      <SelectField
        label="Lease"
        value={lease.leaseId}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Which lease to invite the co-owners of"
        className="flex-wrap"
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
      </SelectField>

      <dl className="m-0 mt-[14px] grid grid-cols-2 gap-[10px] min-[620px]:grid-cols-4">
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
          <div
            key={term}
            className="rounded-[10px] bg-mv-portal-wash px-[10px] py-2"
          >
            <dt className="text-[10.5px] font-bold tracking-[0.05em] text-mv-muted uppercase">
              {term}
            </dt>
            <dd className="m-0 mt-[3px] text-[13px] font-semibold text-mv-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </StepCard>
  );
}
