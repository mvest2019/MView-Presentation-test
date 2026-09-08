"use client";

import { Lock, RefreshCw, Users } from "lucide-react";

import { PortalButton } from "../../../_components/ui/button";
import { claimCandidates } from "../../_lib/claim-records";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { CandidateCard } from "./candidate-card";

/**
 * STEP 2 — pick the record that is yours.
 *
 * ── THE THREE ARE NOT DUPLICATES, AND THE COPY HAS TO SAY SO ──
 *
 * "Records are never merged on name." Three parties share the owner string
 * RAYMOND SMITH; treating them as one person with three addresses is precisely
 * the mistake that would attach a stranger's minerals to this account. So they
 * are presented as distinct parties, and the guide box states the rule that
 * makes them distinct — address is the discriminator, name is not.
 *
 * ── PICKING DOES NOT COMMIT, AND SAYS SO TWICE ──
 *
 * Once in the caption bar above, once in the rail beside. Selecting a card here
 * only opens it for confirmation on step 3; the flow does not advance on its
 * own, so a mis-tap costs one more tap and nothing else.
 */
export function StepPick({
  selectedId,
  onChoose,
  onSearchAgain,
}: {
  /** Which record is already chosen — set when step 3 sends the reader back. */
  selectedId: string | null;
  /** The card's button — take that record on to step 3. */
  onChoose: (id: string) => void;
  onSearchAgain: () => void;
}) {
  return (
    <div className="grid gap-[18px]">
      {/* NO BODY PARAGRAPH ON THIS STEP (requested). The heading and the one
          bold instruction carry it: three records, pick the one that is you.
          What the paragraph explained — that the three are separate parties and
          are never merged on a shared name — is still stated below, in the
          guide box, which is where the rest of the flow puts its mechanics. */}
      <StepIntro
        step={2}
        icon={Users}
        title={`${claimCandidates.length} candidate owner records`}
        lead="Choose the one that best matches you."
      />

      <div className="grid gap-3">
        {claimCandidates.map((candidate, i) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            index={i + 1}
            selected={candidate.id === selectedId}
            onChoose={() => onChoose(candidate.id)}
          />
        ))}
      </div>

      <GuideNote title="Why there are three">
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
