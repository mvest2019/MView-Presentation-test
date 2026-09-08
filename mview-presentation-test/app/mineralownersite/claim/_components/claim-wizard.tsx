"use client";

import {
  BookmarkCheck,
  CircleAlert,
  Lock,
  PauseCircle,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";

import { claimReference } from "../_lib/claim-done";
import { leasesByValue } from "../_lib/claim-totals";
import { ClaimShell } from "./claim-shell";
import { DoneGroups } from "./done-groups";
import { DoneNextCard } from "./done-next-card";
import { DoneValueCard } from "./done-value-card";
import { ProgressRail } from "./progress-rail";
import { RailNote } from "./rail-note";
import { UnlockCard } from "./unlock-card";
import { StepDone } from "./steps/step-done";
import { StepFind } from "./steps/step-find";
import { StepLeases } from "./steps/step-leases";
import { StepPick } from "./steps/step-pick";
import { StepProve } from "./steps/step-prove";
import { StepVisibility } from "./steps/step-visibility";

/**
 * THE FIVE-STEP CLAIM FLOW — the one client component in this module.
 *
 * ── WHY THE STATE LIVES HERE AND NOWHERE ELSE ──
 *
 * Four pieces of state, and three of them are read by a step OTHER than the one
 * that sets them: the candidate picked on step 2 is what step 3 ticks by
 * default, the records confirmed on step 3 are what step 4 describes, and the
 * lease chosen on step 5 is what its own footer names. A `useState` inside each
 * step would leave every one of those hand-offs to a prop drilled through the
 * shell anyway — so the state sits at the top and each step takes exactly the
 * slice it needs plus a callback.
 *
 * The five step components stay presentational because of that, which is what
 * lets each of them be read on its own.
 *
 * ── THIS IS A PROTOTYPE, AND IT DOES NOT PRETEND OTHERWISE ──
 *
 * No fetch, no persistence, no claim is written — the record is the fictional
 * one in `_lib/claim-records.ts`, like every other figure in this portal. The
 * terminal button is a `PrototypeButton` that says "(prototype)" when pressed,
 * which is the portal's established idiom for a control whose wiring is the
 * missing part rather than the design. When there is an API behind this, the
 * shape it needs is already here: one submit on step 1, one confirm on step 3,
 * one visibility write on step 5.
 *
 * ── STEP 1 IS RE-ENTERED, NOT RESET ──
 *
 * "Search again" on step 2 goes back to step 1 and leaves the selection alone.
 * Someone refining a search has not changed their mind about which record is
 * theirs, and clearing it would make an idle back-and-forth destructive.
 */
export function ClaimWizard() {
  const [step, setStep] = useState(1);

  /** Step 2's choice — which candidate opens for confirmation on step 3. */
  const [pickedId, setPickedId] = useState<string | null>(null);

  /**
   * Step 3's ticks. Seeded from the pick rather than starting empty: the reader
   * has already said which record is theirs, and making them say it again on
   * the next screen reads as the flow not having listened.
   */
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [attested, setAttested] = useState(false);

  /** Step 5's single free slot, pre-selected by descending MVestimate. */
  const [visibleNumber, setVisibleNumber] = useState(leasesByValue[0].number);

  /*
   * THE FLOW IS OVER. A separate flag rather than a sixth step, because the
   * completion screen is not a step: it has no stepper node, nothing after it,
   * and no way back into the form. Modelling it as `step === 6` would have
   * every `claimSteps[current - 1]` lookup in the shell reading past the end of
   * a five-element array to find out.
   */
  const [finished, setFinished] = useState(false);

  /*
   * ONE ACTION on step 2 again, now that the per-card radio is gone: the card's
   * button records the choice and moves to step 3 in the same gesture. It seeds
   * step 3's tick as well as `pickedId`, so the reader is not asked which record
   * is theirs twice in a row.
   */
  function pickCandidate(id: string) {
    setPickedId(id);
    setConfirmedIds([id]);
    setStep(3);
  }

  function toggleConfirmed(id: string, checked: boolean) {
    setConfirmedIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((held) => held !== id),
    );
  }

  const rail = finished ? (
    <>
      <DoneNextCard />
      <RailNote icon={BookmarkCheck} title="Keep your claim reference.">
        <b className="font-semibold text-mv-green-deep">{claimReference}</b> —
        quote it if you ever write to support about this record.
      </RailNote>
      <DoneValueCard />
    </>
  ) : (
    <>
      <ProgressRail current={step} />

      {step === 1 && (
        <RailNote icon={Lock} title="You can't break anything.">
          Nothing is committed until you confirm on step 3. You can stop at any
          point, and a claim can be undone from Settings at any time.
        </RailNote>
      )}

      {/* Step 2's rail is the unlock preview alone — the "Still nothing
          committed." note that sat above it has been removed (requested). */}
      {step === 2 && <UnlockCard />}

      {step === 3 && (
        <RailNote icon={RotateCcw} tone="amber" title="Claimed by mistake?">
          You can unclaim anytime in Settings. It never changes legal ownership,
          and it never costs anything.
        </RailNote>
      )}

      {step === 4 && (
        <RailNote icon={CircleAlert} title="Nothing to fill in on this screen.">
          It&rsquo;s a read-through — check the list looks like yours, then
          continue.
        </RailNote>
      )}

      {step === 5 && (
        <RailNote icon={PauseCircle} tone="amber" title="Inactive isn't lost.">
          Where our model projects about $0 we show the county&rsquo;s appraised
          value instead, labelled — so a lease you own never reads $0.
        </RailNote>
      )}
    </>
  );

  if (finished) {
    return (
      <ClaimShell current={step} done rail={rail} below={<DoneGroups />}>
        <StepDone confirmedIds={confirmedIds} visibleNumber={visibleNumber} />
      </ClaimShell>
    );
  }

  return (
    <ClaimShell current={step} rail={rail}>
      {step === 1 && <StepFind onSearch={() => setStep(2)} />}

      {step === 2 && (
        <StepPick
          selectedId={pickedId}
          onChoose={pickCandidate}
          onSearchAgain={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepProve
          selectedIds={confirmedIds}
          onToggleRecord={toggleConfirmed}
          attested={attested}
          onAttest={setAttested}
          onConfirm={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && <StepLeases onContinue={() => setStep(5)} />}

      {step === 5 && (
        <StepVisibility
          visibleNumber={visibleNumber}
          onChoose={setVisibleNumber}
          onFinish={() => setFinished(true)}
        />
      )}
    </ClaimShell>
  );
}
