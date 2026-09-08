"use client";

import { ChevronRight, EyeOff } from "lucide-react";

import { Badge } from "../../../../_components/ui/badge";
import { PortalButton } from "../../../../_components/ui/button";
import { mailCity, maskedAddress } from "../../_lib/claim-format";
import type { OwnerRecord } from "../../_lib/claim-types";

/**
 * ONE CANDIDATE OWNER RECORD on step 2 — a row from `GET /owners/search`.
 *
 * ── THE VALUE IS MASKED, AND THE MASK IS THE HONEST PART ──
 *
 * The search response DOES carry `appraisedValue` for every hit, so this is a
 * deliberate withholding and not a gap in the data. Printing the figure for
 * every match would hand a stranger the appraised value of records that are not
 * theirs, on a page that has verified nothing about them. The mask is not a
 * paywall and must not read like one, which is why the sentence names
 * CONFIRMATION and not a plan.
 *
 * ── THE ADDRESS IS MASKED TOO, DOWN TO THE CITY ──
 *
 * Same reason, one step further: "•••• Lampasas, TX" is enough for someone to
 * recognise their own record without publishing a stranger's doorstep. The full
 * street line appears on step 3, and only for the record they picked.
 *
 * `selected` styles the border. It is not dead: step 3's "← Back to the
 * records" returns here with a record already chosen.
 */
export function CandidateCard({
  record,
  index,
  selected,
  onChoose,
}: {
  record: OwnerRecord;
  /** 1-based, so the card matches the "N candidate records" count above. */
  index: number;
  selected: boolean;
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
              {record.name}
            </h3>
            {mailCity(record.address) && (
              <Badge tone="mint" size="xs">
                Mail goes to: {mailCity(record.address)}
              </Badge>
            )}
          </div>

          <p className="mt-[6px] text-[12px] text-mv-muted">
            {record.address ? maskedAddress(record.address) : "No address on file"}
          </p>

          <div className="mt-[10px] flex flex-wrap gap-[6px]">
            <Badge tone="mint" size="xs">
              {record.leaseCount} lease{record.leaseCount === 1 ? "" : "s"} tied
              to record
            </Badge>
            <Badge tone="slate" size="xs">
              {record.county}
            </Badge>
            {record.operatorCount > 0 && (
              <Badge tone="slate" size="xs">
                {record.operatorCount} operator
                {record.operatorCount === 1 ? "" : "s"}
              </Badge>
            )}
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
