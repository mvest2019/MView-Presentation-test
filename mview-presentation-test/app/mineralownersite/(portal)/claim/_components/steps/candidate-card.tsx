"use client";

import { Check, EyeOff } from "lucide-react";
import { memo } from "react";

import { Badge } from "../../../../_components/ui/badge";
import { mailCity } from "../../_lib/claim-format";
import type { OwnerRecord } from "../../_lib/claim-types";

/**
 * ONE CANDIDATE OWNER RECORD on step 2 — a row from `GET /owners/search`.
 *
 * ── IT IS A CHECKBOX, NOT A BUTTON ──
 *
 * Each card used to carry its own "This one's mine →" which selected the record
 * AND advanced in one gesture, so only one record could ever be taken. An owner
 * whose name is on the roll three times — a maiden name, an initial, an old
 * address — had to run the flow three times.
 *
 * Now the whole card is a `<label>` around a real checkbox: click anywhere to
 * tick it, tick as many as are yours, and one button at the foot of the list
 * carries them all forward. The native control is what makes the card
 * keyboard-reachable and announces its own checked state; only the paint is
 * ours.
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
 * "•••• Lampasas, TX" is enough to recognise your own record without publishing
 * a stranger's doorstep. The full street line appears on step 3, and only for
 * the records you actually took.
 */
export const CandidateCard = memo(function CandidateCard({
  record,
  index,
  selected,
  onToggle,
}: {
  record: OwnerRecord;
  /** 1-based, so the card matches the "N candidate records" count above. */
  index: number;
  selected: boolean;
  /**
   * TAKES THE RECORD BACK, rather than the caller closing over it.
   *
   * `onToggle={(checked) => onToggle(record, checked)}` reads more naturally
   * at the call site and is what made `memo` useless: a fresh arrow per card
   * per render is a changed prop on all 1,153 of them, so every one re-rendered
   * on every tick. Handing the record back keeps the prop identical between
   * renders, which is the whole condition for skipping the work.
   */
  onToggle: (record: OwnerRecord, checked: boolean) => void;
}) {
  /* ONCE, NOT THREE TIMES. This was called in the condition, again in the
     badge, and a third time inside `maskedAddress` — three string splits per
     card, 3,459 of them across the list, for one answer. */
  const city = mailCity(record.address);

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-mv border p-4 transition-colors ${
        selected
          ? "border-mv-green bg-mv-mint/40"
          : "border-mv-line bg-mv-card hover:border-mv-line-strong"
      }`}
    >
      <span className="flex flex-none items-center gap-2 pt-[1px]">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggle(record, e.target.checked)}
          className="h-[15px] w-[15px] cursor-pointer accent-mv-green-deep outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.28)]"
        />
        <span className="text-[12px] font-bold text-mv-muted">{index}</span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1">
          <h3 className="text-[13.5px] font-extrabold tracking-[.01em] text-mv-ink">
            {record.name}
          </h3>
          {city && (
            <Badge tone="mint" size="xs">
              Mail goes to: {city}
            </Badge>
          )}
        </div>

        <p className="mt-[5px] text-[12px] text-mv-muted">
          {!record.address
            ? "No address on file"
            : city
              ? `•••• ${city}`
              : record.address}
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
        </div>

        <p className="mt-[10px] flex items-center gap-x-[6px] text-[12px] text-mv-muted">
          <EyeOff aria-hidden="true" className="h-[13px] w-[13px] flex-none" />
          <b className="font-semibold text-mv-slate">Estimated value: $•,•••</b>
          <span aria-hidden="true">·</span>
          shown once confirmed
        </p>
      </div>

      {/* The tick is the selected state said a second way — a green border on
          its own is colour carrying meaning alone. */}
      {selected && (
        <span
          aria-hidden="true"
          className="flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full bg-mv-green-deep text-white"
        >
          <Check className="h-[12px] w-[12px]" strokeWidth={3} />
        </span>
      )}
    </label>
  );
});
