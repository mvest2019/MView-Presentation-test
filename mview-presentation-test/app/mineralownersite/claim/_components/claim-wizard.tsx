"use client";

import {
  BookmarkCheck,
  CircleAlert,
  Lock,
  PauseCircle,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  fetchCounties,
  fetchSameName,
  postClaim,
  searchOwners,
  type ClaimResult,
} from "../_api/claim-api";
import { byValueDesc, leaseKey } from "../_lib/claim-format";
import type {
  CountyIndex,
  OwnerRecord,
  SameNameResult,
} from "../_lib/claim-types";
import { ClaimShell } from "./claim-shell";
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

/** One request: what it holds, whether it is in flight, and how it failed. */
export interface Async<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const idle = <T,>(): Async<T> => ({ data: null, loading: false, error: null });

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

/**
 * THE FIVE-STEP CLAIM FLOW — the one client component in this module, and the
 * only one that talks to the network.
 *
 * ── WHY EVERY CALL LIVES HERE ──
 *
 * Endpoints feed more than one step. The `/same-name` answer alone drives step
 * 3's record list, step 4's lease table and step 5's visibility grid; the
 * search result is step 2's cards AND the input to that same-name call.
 * Fetching inside each step would mean calling `/same-name` three times for one
 * claim, and three chances for the three screens to disagree about what was
 * claimed.
 *
 * So the steps stay presentational: each takes the slice of state it renders
 * plus a callback, and none of them imports the API.
 *
 * ── WHICH ENDPOINT RUNS WHERE ──
 *
 *   1  GET  /owners/counties           on mount — step 1's dropdown and tally
 *   2  GET  /owners/search             step 1's submit → step 2's candidates
 *   4  GET  /owners/same-name          step 2's pick → steps 3, 4 and 5
 *   5  POST /owners/claim              step 3's Confirm — the write
 *   6  POST /owners/address-correction step 3's "Something looks wrong"
 *
 * `GET /owners/lease-owners` is the sixth and this flow never asks what it
 * answers — "who else is on this lease" is the marketing finder's tick-a-lease
 * interaction, wired there. `fetchLeaseOwners` is exported so the set of six is
 * complete and a co-owner view on step 4 is one component away.
 *
 * ── THE API LAYER IS THIS MODULE'S OWN ──
 *
 * `_api/claim-api.ts` calls all six endpoints directly and imports nothing
 * from `lib/claim-search`, which serves the marketing finder.
 *
 * ── THE CLAIM IS WRITTEN ON STEP 3, NOT AT THE END ──
 *
 * That is what every screen already promises: step 3's caption says "This is
 * the step that commits", steps 1 and 2 say nothing is committed yet, and step
 * 4's says "Claimed · one step left". Posting on step 5's Finish instead would
 * make all four of those statements wrong.
 */
export function ClaimWizard({ memberId }: { memberId: number | null }) {
  const [step, setStep] = useState(1);

  const [counties, setCounties] = useState<Async<CountyIndex>>({
    data: null,
    loading: true,
    error: null,
  });
  const [results, setResults] = useState<Async<OwnerRecord[]>>(idle());
  const [picked, setPicked] = useState<OwnerRecord | null>(null);
  const [sameName, setSameName] = useState<Async<SameNameResult>>(idle());
  const [claim, setClaim] = useState<Async<ClaimResult>>(idle());

  /** Step 3's ticks, keyed by record address — seeded from the pick. */
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [attested, setAttested] = useState(false);

  /** Step 5's single free slot. Chosen once the lease set is known. */
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  /*
   * A PROMISE CHAIN, NOT AN AWAITED CALL — the pattern `app/claim`'s finder
   * already uses for its own mount fetch. Both settle the state in a callback
   * rather than in the effect body, which is what `set-state-in-effect` is
   * asking for: an awaited helper reads as a synchronous setState to the rule
   * even when the write happens a tick later.
   *
   * The "loading" flag is the state's INITIAL value, so mounting never has to
   * set it. Only the retry does, and that runs outside the effect.
   */
  const loadCounties = useCallback(() => {
    fetchCounties()
      .then((data) => setCounties({ data, loading: false, error: null }))
      .catch((error) =>
        setCounties({ data: null, loading: false, error: message(error) }),
      );
  }, []);

  useEffect(loadCounties, [loadCounties]);

  function retryCounties() {
    setCounties({ data: null, loading: true, error: null });
    loadCounties();
  }

  async function runSearch(query: {
    name: string;
    lease: string;
    county: string;
  }) {
    setResults({ data: null, loading: true, error: null });
    setStep(2);
    try {
      const found = await searchOwners({ ...query, limit: 50 });
      setResults({ data: found.owners, loading: false, error: null });
    } catch (error) {
      setResults({ data: null, loading: false, error: message(error) });
    }
  }

  /**
   * Picking a record fetches everything the rest of the flow needs, then moves
   * on. The step advances BEFORE the call resolves so step 3 opens on its own
   * spinner rather than leaving the reader on step 2 wondering whether their
   * tap registered.
   */
  async function pickRecord(record: OwnerRecord) {
    setPicked(record);
    setConfirmed([record.address]);
    setSameName({ data: null, loading: true, error: null });
    setStep(3);
    try {
      const found = await fetchSameName(record.name, record.address);
      setSameName({ data: found, loading: false, error: null });
      const first = byValueDesc(found.all.leases)[0];
      setVisibleKey(first ? leaseKey(first) : null);
    } catch (error) {
      setSameName({ data: null, loading: false, error: message(error) });
    }
  }

  /**
   * THE WRITE. Owner NAMES are the unit of a claim — the backend resolves each
   * name's leases itself, statewide — so the ticked records are reduced to
   * their DISTINCT names. Two ticked records can carry the same name at two
   * addresses, and sending it twice would be a wasted round trip and a spurious
   * OWNER_ALREADY_CLAIMED in the results.
   */
  async function confirmClaim() {
    if (memberId === null) return;
    const records = [
      ...(sameName.data?.selected ? [sameName.data.selected] : []),
      ...(sameName.data?.others ?? []),
    ].filter((r) => confirmed.includes(r.address));
    const names = [...new Set(records.map((r) => r.name))];
    if (names.length === 0) return;

    setClaim({ data: null, loading: true, error: null });
    try {
      const result = await postClaim(memberId, names);
      setClaim({ data: result, loading: false, error: null });
      setStep(4);
    } catch (error) {
      setClaim({ data: null, loading: false, error: message(error) });
    }
  }

  const leases = sameName.data?.all.leases ?? [];

  const rail = finished ? (
    <>
      <DoneNextCard />
      {/* No claim-reference card: `POST /owners/claim` returns `claimedAt` and
          per-owner counts, and no reference id. The date it filed is on the
          receipt itself, which is the thing support can actually look up. */}
      <RailNote icon={BookmarkCheck} title="Your claim is on your account.">
        Every lease it took is listed on your dashboard, and Settings can
        unclaim it at any time.
      </RailNote>
      <DoneValueCard total={sameName.data?.all.appraisedValue ?? 0} />
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
          A lease with no appraised value on the roll is still yours, still
          counted, and still joined to your record.
        </RailNote>
      )}
    </>
  );

  if (finished) {
    return (
      <ClaimShell current={step} done rail={rail}>
        <StepDone
          record={sameName.data?.selected ?? picked}
          pending={(sameName.data?.others ?? []).filter((r) =>
            confirmed.includes(r.address),
          )}
          all={sameName.data?.all ?? null}
          visibleKey={visibleKey}
          result={claim.data}
        />
      </ClaimShell>
    );
  }

  return (
    <ClaimShell current={step} rail={rail}>
      {step === 1 && (
        <StepFind
          counties={counties}
          onRetryCounties={retryCounties}
          onSearch={runSearch}
        />
      )}

      {step === 2 && (
        <StepPick
          results={results}
          pickedAddress={picked?.address ?? null}
          onChoose={pickRecord}
          onSearchAgain={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepProve
          sameName={sameName}
          picked={picked}
          memberId={memberId}
          confirmed={confirmed}
          onToggleRecord={(address, checked) =>
            setConfirmed((current) =>
              checked
                ? [...new Set([...current, address])]
                : current.filter((held) => held !== address),
            )
          }
          attested={attested}
          onAttest={setAttested}
          claiming={claim.loading}
          claimError={claim.error}
          onConfirm={confirmClaim}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <StepLeases
          record={sameName.data?.selected ?? picked}
          leases={leases}
          all={sameName.data?.all ?? null}
          onContinue={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <StepVisibility
          leases={leases}
          visibleKey={visibleKey}
          onChoose={setVisibleKey}
          onFinish={() => setFinished(true)}
        />
      )}
    </ClaimShell>
  );
}
