"use client";

import { ChevronRight, EyeOff } from "lucide-react";

import { Badge } from "../../../_components/ui/badge";
import { PortalButton } from "../../../_components/ui/button";
import type { ClaimCandidate } from "../../_lib/claim-records";

/**
 * ONE CANDIDATE OWNER RECORD on step 2.
 *
 * ── ONE CONTROL PER CARD ──
 *
 * The button, and nothing else. A radio sat to the left of the number for a
 * while and has been removed (requested): with a "This one's mine →" button on
 * every card it was a second way to express the same choice, and two controls
 * for one decision is a question about which of them actually does the thing.
 *
 * The number stays as a plain label — the copy above counts "3 candidate owner
 * records" and the reader should be able to match one to the other.
 *
 * `selected` still styles the card's border. It is not dead: step 3's "← Back
 * to the records" returns here with a record already chosen, and this is what
 * shows which one that was.
 *
 * ── THE VALUE IS MASKED, AND THE MASK IS THE HONEST PART ──
 *
 * `$•,•••` behind a struck-through eye, with "shown after you confirm this
 * record is yours" beside it. Printing the figure for all three would hand a
 * stranger the appraised value of two records that are not theirs, on a page
 * that has verified nothing about them. The mask is not a paywall and must not
 * read like one, which is why the sentence names CONFIRMATION and not a plan.
 */
export function CandidateCard({
  candidate,
  index,
  selected,
  onChoose,
}: {
  candidate: ClaimCandidate;
  /** 1-based, so the card matches the "3 candidate owner records" count above. */
  index: number;
  /** Chosen already — set when step 3 sends the reader back here. */
  selected: boolean;
  /** The button — take this record and go to step 3. */
  onChoose: () => void;
}) {
  return (
    <article
      className={`rounded-mv border bg-mv-card p-4 transition-colors ${
        selected ? "border-mv-green" : "border-mv-line"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex-none pt-[2px] text-[12px] font-bold text-mv-muted">
          {index}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1">
            <h3 className="text-[13.5px] font-extrabold tracking-[.01em] text-mv-ink">
              {candidate.name}
            </h3>
            <Badge tone="mint" size="xs">
              Mail goes to: {candidate.mailCity}
            </Badge>
          </div>

          <p className="mt-[6px] text-[12px] text-mv-muted">
            Record:{" "}
            <b className="font-semibold text-mv-green-deep">{candidate.id}</b> ·{" "}
            {candidate.maskedAddress}
          </p>

          {/* "Used when you verify" sits with the other chips now rather than
              beside the address — it is a fact ABOUT this record, the same as
              its lease count and its county, not an annotation on one line. */}
          <div className="mt-[10px] flex flex-wrap gap-[6px]">
            <Badge tone="mint" size="xs">
              {candidate.leaseCount} leases tied to record
            </Badge>
            <Badge tone="slate" size="xs">
              {candidate.county}
            </Badge>
            <Badge tone="slate" size="xs">
              {candidate.operatorCount} operators
            </Badge>
            <Badge tone="mint" size="xs">
              Used when you verify
            </Badge>
          </div>

          <p className="mt-[10px] flex flex-wrap items-center gap-x-[6px] text-[12px] text-mv-muted">
            <EyeOff aria-hidden="true" className="h-[13px] w-[13px] flex-none" />
            <b className="font-semibold text-mv-slate">
              Estimated value: $•,•••
            </b>
            <span aria-hidden="true">·</span>
            Shown after you confirm this record is yours.
          </p>
        </div>

        {/* The chevron sits above the button and both hug the right edge —
            `justify-between` over a column stretched to the card's height. The
            chevron is `aria-hidden`: it is a direction hint on the button below
            it, not a second control. */}
        <div className="ml-auto flex flex-none flex-col items-end justify-between gap-3 self-stretch">
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 text-mv-placeholder"
          />
          <PortalButton variant="primary" size="sm" onClick={onChoose}>
            This one&rsquo;s mine →
          </PortalButton>
        </div>
      </div>
    </article>
  );
}
