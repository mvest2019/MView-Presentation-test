"use client";

import { Lock, RefreshCw, Users } from "lucide-react";

import { PortalButton } from "../../../../_components/ui/button";
import type { OwnerRecord } from "../../_lib/claim-types";
import type { Async } from "../claim-wizard";
import { FlowEmpty, FlowError, FlowLoading } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { CandidateCard } from "./candidate-card";

/**
 * STEP 2 — pick the record that is yours, from `GET /owners/search`.
 *
 * ── FOUR OUTCOMES, NOT TWO ──
 *
 * Loading, failed, found-nothing and found-something are all normal here and
 * each gets its own answer. The one that is easy to collapse into "error" is
 * found-nothing, and it is the one a reader is most likely to hit: a search
 * that matched nobody is not a fault, and dressing it in red sends someone
 * hunting for a broken page instead of trying initials or a different county.
 *
 * ── THE HEADING COUNTS WHAT IS ON SCREEN ──
 *
 * Not the backend's `total`, which can be larger than the page returned. A
 * heading that says 281 above 50 cards is a heading the reader will try to
 * scroll to the end of.
 */
export function StepPick({
  results,
  pickedAddress,
  onChoose,
  onSearchAgain,
}: {
  results: Async<OwnerRecord[]>;
  /** Which record is already chosen — set when step 3 sends the reader back. */
  pickedAddress: string | null;
  onChoose: (record: OwnerRecord) => void;
  onSearchAgain: () => void;
}) {
  const records = results.data ?? [];

  return (
    <div className="grid gap-[18px]">
      <StepIntro
        step={2}
        icon={Users}
        title={
          results.loading
            ? "Searching the public record…"
            : `${records.length} candidate owner record${records.length === 1 ? "" : "s"}`
        }
        lead={
          records.length > 0 ? "Choose the one that best matches you." : undefined
        }
      />

      {results.loading && (
        <FlowLoading label="Searching every county appraisal roll…" />
      )}

      {results.error && (
        <FlowError message={results.error} onRetry={onSearchAgain} />
      )}

      {!results.loading && !results.error && records.length === 0 && (
        <FlowEmpty
          message="No records matched that search."
          hint="Try initials, an entity name, or a different county — records often carry old spellings."
        />
      )}

      {records.length > 0 && (
        <div className="grid gap-3">
          {records.map((record, i) => (
            <CandidateCard
              key={`${record.county}|${record.name}|${record.address}`}
              record={record}
              index={i + 1}
              selected={record.address === pickedAddress}
              onChoose={() => onChoose(record)}
            />
          ))}
        </div>
      )}

      <GuideNote title="Why there may be several">
        Name-only matching is unsafe: identical owner strings recur across
        unrelated parties.
        <br />
        Address is the discriminator — city pre-verification, street
        post-verification, no cross-record merge on name.
      </GuideNote>

      <div className="border-t border-mv-line pt-[18px]">
        <PortalButton variant="ghost" size="sm" onClick={onSearchAgain}>
          <RefreshCw aria-hidden="true" className="h-[13px] w-[13px]" />
          Search again
        </PortalButton>
        <p className="mt-3 text-[12px] text-mv-muted">
          Not the right records? Try initials, an entity name, or a different
          county — records often carry old spellings.
        </p>
      </div>

      <p className="-mx-[22px] -mb-[22px] flex items-center gap-[6px] border-t border-mv-line px-[22px] py-[10px] text-[11.5px] text-mv-muted max-[767px]:-mx-4 max-[767px]:-mb-4 max-[767px]:px-4">
        <Lock aria-hidden="true" className="h-[12px] w-[12px]" />
        Values are withheld until a record is confirmed as yours.
      </p>
    </div>
  );
}
