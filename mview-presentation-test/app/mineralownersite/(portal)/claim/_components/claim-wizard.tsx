"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchClaimSet,
  fetchCounties,
  postClaim,
  searchOwners,
  type ClaimResult,
} from "../_api/claim-api";
import { byValueDesc, leaseKey, recordKey } from "../_lib/claim-format";
import type { ClaimSet, CountyIndex, OwnerRecord } from "../_lib/claim-types";
import { ClaimShell } from "./claim-shell";
import {
  SEARCH_DEBOUNCE_MS,
  emptyQuery,
  isSearchable,
  type ClaimQuery,
} from "./search-fields";
import { DoneNextCard } from "./done-next-card";
import { DoneValueCard } from "./done-value-card";
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
  /*
   * THE QUERY LIVES HERE because BOTH step 1 and step 2 render the fields —
   * step 2 so a thousand-row result can be narrowed without losing it. Local
   * state in either step would be discarded the moment that step unmounted, and
   * the reader would find the filter bar blank on the results they just ran.
   */
  const [query, setQuery] = useState<ClaimQuery>(emptyQuery);
  const [results, setResults] = useState<Async<OwnerRecord[]>>(idle());
  /*
   * SEVERAL RECORDS, not one. An owner is often on the roll more than once, and
   * `/owners/claim` takes up to 25 names in a single transaction — so step 2
   * ticks a set and the whole set moves forward together.
   */
  const [picked, setPicked] = useState<OwnerRecord[]>([]);
  const [claimSet, setClaimSet] = useState<Async<ClaimSet>>(idle());
  const [claim, setClaim] = useState<Async<ClaimResult>>(idle());

  /** Step 3's ticks, keyed by county|name|address — seeded from the pick. */
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

  /*
   * ONE SEARCH AT A TIME, AND THE LATEST ONE WINS.
   *
   * Without this the flow has a race it loses silently. Type "poo", then
   * "pooja"; "poo" matches thousands and takes longer to come back, so it
   * lands AFTER "pooja" and overwrites five specific results with three
   * thousand vague ones — under a search box that says "pooja". The bug looks
   * like the API returning nonsense.
   *
   * So each new search aborts the one before it, and the response is thrown
   * away unless its own controller is still the live one. Aborting also stops
   * the browser holding open requests nobody is waiting for.
   */
  const searchRef = useRef<AbortController | null>(null);

  /* Serialised copy of the last query actually sent, so arriving on step 2
     does not immediately re-run the search step 1 just fired. */
  const searchedRef = useRef<string>("");

  const runSearch = useCallback((next: ClaimQuery) => {
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    searchedRef.current = JSON.stringify(next);

    /* KEEP THE ROWS THAT ARE ALREADY THERE. Blanking the list on every
       keystroke made the page flash between a full result and a loading slab;
       the old rows stay put and step 2 marks them as refreshing instead. */
    setResults((prev) => ({ data: prev.data, loading: true, error: null }));

    /* NO `limit` — paging on this endpoint is opt-in, and omitting it returns
       the whole result set. Sending one silently truncated the answer: step
       2's heading counts the cards on screen, so a capped response made it
       report fewer candidate records than the search actually matched. */
    searchOwners(next, controller.signal)
      .then((found) => {
        if (controller.signal.aborted) return;
        setResults({ data: found.owners, loading: false, error: null });
      })
      .catch((error) => {
        /* A superseded search is not a failure — it aborts into this catch
           exactly like a dead network would, and showing the reader an error
           for a request we cancelled ourselves would be a lie. */
        if (controller.signal.aborted) return;
        setResults({ data: null, loading: false, error: message(error) });
      });
  }, []);

  /** Step 1's button: go to the results and search at once, no debounce. */
  function startSearch() {
    setStep(2);
    if (isSearchable(query)) runSearch(query);
  }

  /*
   * THE DEBOUNCE — one request per pause, not one per keystroke.
   *
   * Only on step 2, because that is the only step showing results to update.
   * The timer is cleared on every change, so the request goes out 400ms after
   * typing STOPS rather than 400ms after it starts.
   *
   * The `searchedRef` guard is what stops this firing a second, identical
   * search the moment step 1 hands over — the button already sent that exact
   * query.
   */
  useEffect(() => {
    if (step !== 2 || !isSearchable(query)) return;
    if (JSON.stringify(query) === searchedRef.current) return;
    const timer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [step, query, runSearch]);

  /* Nothing in flight should outlive the flow. */
  useEffect(() => () => searchRef.current?.abort(), []);

  function toggleRecord(record: OwnerRecord, checked: boolean) {
    setPicked((current) =>
      checked
        ? [...current, record]
        : current.filter((r) => recordKey(r) !== recordKey(record)),
    );
  }

  /**
   * Confirming the selection resolves every picked record against
   * `/same-name` — in parallel, merged and deduplicated — and that one answer
   * feeds steps 3, 4 and 5.
   *
   * The step advances BEFORE the calls resolve so step 3 opens on its own
   * spinner, rather than leaving the reader on a list of a thousand rows
   * wondering whether the button registered.
   */
  async function resolveSelection() {
    if (picked.length === 0) return;
    setClaimSet({ data: null, loading: true, error: null });
    setStep(3);
    try {
      const set = await fetchClaimSet(picked);
      setClaimSet({ data: set, loading: false, error: null });
      setConfirmed(set.records.map(recordKey));
      const first = byValueDesc(set.all.leases)[0];
      setVisibleKey(first ? leaseKey(first) : null);
    } catch (error) {
      setClaimSet({ data: null, loading: false, error: message(error) });
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

    /*
     * ALREADY FILED — GO FORWARD, DO NOT POST AGAIN.
     *
     * Step 4 can now come back here, and step 3 is the step that writes. Left
     * unguarded, "Back" then "Confirm" would post the same owner names twice:
     * the backend answers the second with OWNER_ALREADY_CLAIMED per name, so
     * the receipt the reader lands on would list their own successful claim as
     * a row of failures. Returning here is a review, so the button moves on.
     */
    if (claim.data) {
      setStep(4);
      return;
    }

    const records = [
      ...(claimSet.data?.records ?? []),
      ...(claimSet.data?.others ?? []),
    ].filter((r) => confirmed.includes(recordKey(r)));
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

  const leases = claimSet.data?.all.leases ?? [];

  /*
   * THE COMPLETION SCREEN'S TWO EXTRA BLOCKS, FULL WIDTH BELOW THE RECEIPT.
   *
   * They used to sit in the side rail, which is gone. They did not go with it
   * because they are not asides: "what to do next" is the only thing on a
   * finished screen asking the reader to act, and the claimed value is the
   * figure the claim just produced. The per-step reassurance notes and the
   * vertical progress list DID go — the first were asides, and the second
   * repeated the stepper at the top of the card.
   */
  const doneExtras = (
    <div className="grid gap-3 @[720px]:grid-cols-2">
      <DoneNextCard />
      <DoneValueCard total={claimSet.data?.all.appraisedValue ?? 0} />
    </div>
  );

  if (finished) {
    return (
      <ClaimShell current={step} done below={doneExtras}>
        <StepDone
          records={claimSet.data?.records ?? picked}
          pending={(claimSet.data?.others ?? []).filter((r) =>
            confirmed.includes(recordKey(r)),
          )}
          all={claimSet.data?.all ?? null}
          visibleKey={visibleKey}
          result={claim.data}
        />
      </ClaimShell>
    );
  }

  return (
    <ClaimShell current={step}>
      {step === 1 && (
        <StepFind
          query={query}
          onQueryChange={setQuery}
          counties={counties}
          onRetryCounties={retryCounties}
          onSearch={startSearch}
        />
      )}

      {step === 2 && (
        <StepPick
          results={results}
          query={query}
          onQueryChange={setQuery}
          counties={counties}
          selected={picked.map(recordKey)}
          onToggle={toggleRecord}
          onContinue={resolveSelection}
          resolving={claimSet.loading}
          /* Enter skips the debounce — the reader has clearly finished. */
          onSearch={() => runSearch(query)}
          tooShort={!isSearchable(query)}
          onClearSelection={() => setPicked([])}
        />
      )}

      {step === 3 && (
        <StepProve
          claimSet={claimSet}
          memberId={memberId}
          confirmed={confirmed}
          onToggleRecord={(key, checked) =>
            setConfirmed((current) =>
              checked
                ? [...new Set([...current, key])]
                : current.filter((held) => held !== key),
            )
          }
          attested={attested}
          onAttest={setAttested}
          claiming={claim.loading}
          claimError={claim.error}
          onConfirm={confirmClaim}
          onBack={() => setStep(2)}
          alreadyClaimed={claim.data !== null}
        />
      )}

      {step === 4 && (
        <StepLeases
          records={claimSet.data?.records ?? picked}
          leases={leases}
          all={claimSet.data?.all ?? null}
          onContinue={() => setStep(5)}
          onBack={() => setStep(3)}
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
